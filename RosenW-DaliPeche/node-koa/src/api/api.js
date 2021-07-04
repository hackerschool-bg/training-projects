const Koa = require('koa');
const requester = require('request-promise');
const Router = require('koa-router');
const { trace } = require('./../debug/tracer.js');
const { assert, assertPeer } = require('./../asserts/asserts.js');
const { PeerError } = require('./../asserts/exceptions.js');
const { generateRandomString, isObject } = require('./../utils/utils.js');
const bodyParser = require('koa-bodyparser');
const {
  DEFAULT_PORT,
  MAX_API_KEYS_PER_USER,
  MAX_REQUESTS_PER_HOUR,
  AIRPORT_API_LINK,
  CREDITS_FOR_SUCCESSFUL_REQUEST,
  CREDITS_FOR_FAILED_REQUEST,
  API_KEY_LENGTH
} = require('./../utils/consts.js');
const Database = require('./../database/db.js');
const db = Database('pg');
const paths = require('./../etc/config.js');

const app = new Koa();

if (require.main === module) {
  router = new Router({
    prefix: `${paths.APIMountPoint}`
  });
  const server = app.listen(DEFAULT_PORT, () => {
    console.log(`API Server listening on port: ${DEFAULT_PORT}`);
  });

  // Error Handling
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof UserError) {
        ctx.body = {
          message: err.message,
          statusCode: err.statusCode,
        };
      } else if (err instanceof PeerError) {
        ctx.body = {
          message: err.message,
          statusCode: err.statusCode,
        };
      } else {
        console.log(err);
        console.log(`Application Error: ${err.message}, Status code: ${err.statusCode}`);
        ctx.body = 'An error occured please clear your cookies and try again';
      }
    }
  });

  app.use(bodyParser());
} else {
  router = new Router();
}

// POST generate API key
router.post(paths.generateAPIKey, async (ctx, next) => {
  trace(`POST '${paths.generateAPIKey}'`);

  const username = ctx.request.body.name;
  const key = generateRandomString(API_KEY_LENGTH);
  const user = (await db.sql(`SELECT * FROM users WHERE username = $1`, username))[0];

  assert(user != null, 'User not found when generating API key', 11);

  const APIKeyCountData = (await db.sql(`SELECT COUNT(*) FROM api_keys WHERE user_id = $1`, user.id))[0];

  if (APIKeyCountData.count >= MAX_API_KEYS_PER_USER) {
    ctx.body = { msg: 'API key limit exceeded' };
  } else {
    db.sql(`
      INSERT INTO api_keys (key, user_id)
        VALUES ($1, $2)
    `,
    key,
    user.id
    );
    ctx.body = { key };
  }
});

// GET delete key
router.del('/del', async (ctx, next) => {
  trace(`DELETE '/del'`);

  const key = ctx.request.body.key;

  await db.sql(`DELETE FROM api_keys WHERE key = $1`, key);
  ctx.body = {msg: 'Successfuly deleted key'};
});

// POST forecast
router.post(paths.forecast, async (ctx, next) => {
  trace(`POST '${paths.APIMountPoint}${paths.forecast}'`);

  assertPeer(isObject(ctx.request.body), 'No request body provided', 38);

  const response = {};
  const key = ctx.request.body.key;

  let iataCode = ctx.request.body.iataCode;
  let cityName = ctx.request.body.city;

  assertPeer(typeof key === 'string', 'No API key in post body', 31);

  const keyRecord = (await db.sql(`SELECT * FROM api_keys WHERE key = $1`, key))[0];
  assertPeer(isObject(keyRecord), 'invalid API key', 33);

  const user = (await db.sql(`SELECT * FROM users WHERE id = $1`, keyRecord.user_id))[0];
  assert(isObject(user), 'No user found when searching by api key', 13);

  try {
    await updateAPIKeyUsage(keyRecord);

    assertPeer(
      typeof cityName === 'string' ||
      typeof iataCode === 'string',
      'No city or iataCode in post body',
      30
    );

    // if only iatacode is given
    if (typeof cityName !== 'string' && typeof iataCode === 'string') {
      iataCode = iataCode.toLowerCase().trim();
      cityName = await getCityByIATACode(iataCode);
    }

    cityName = cityName.toLowerCase().trim();

    const city = (await db.sql(`SELECT * FROM cities WHERE UNACCENT(LOWER(name)) = LOWER($1)`, cityName))[0];
    assertPeer(isObject(city), 'no information found, please try again later', 39);

    const conditions = await db.sql(`SELECT * FROM weather_conditions WHERE city_id = $1`, city.id);
    assert(Array.isArray(conditions), `expected conditions to be array but wasn't`, 14);
    assertPeer(conditions.length > 0, 'no information found, please try again later', 34);

    response.observed_at = city.observed_at;
    response.city = city.name;
    response.country_code = city.country_code;
    response.lng = city.lng;
    response.lat = city.lat;
    response.conditions = conditions;
  } catch (err) {
    if (err.statusCode === 39) db.sql(`INSERT INTO cities (name) VALUES($1)`, cityName);
    if (err.statusCode !== 35) await taxUser(user, true);
    await updateRequests(iataCode, cityName);
    throw err;
  }

  await taxUser(user, false);
  await updateRequests(iataCode, cityName);

  ctx.body = response;
});

const updateAPIKeyUsage = async (keyRecord) => {
  assertPeer(
    keyRecord.use_count < MAX_REQUESTS_PER_HOUR,
    'you have exceeded your request cap, please try again later',
    35
  );

  await db.sql(`UPDATE api_keys SET use_count = use_count + 1 WHERE id = $1`, keyRecord.id);
};

const updateRequests = async (iataCode, city) => {
  db.makeTransaction(async (client) => {
    const whereCol = typeof iataCode === 'string' ? 'iata_code' : 'city';
    const whereValue = typeof iataCode === 'string' ? iataCode : city;

    if (typeof iataCode !== 'string' && typeof city !== 'string') return;

    const request = (await client.query(`SELECT * FROM requests WHERE ${whereCol} = LOWER($1)`, [ whereValue ])).rows[0];

    if (request == null) {
      await client.query(`INSERT INTO requests (${whereCol}) VALUES (LOWER($1))`, [ whereValue ]);
    } else {
      await client.query(`UPDATE requests SET call_count = call_count + 1 WHERE ${whereCol} = LOWER($1)`, [ whereValue ]);
    }
  });
};

const taxUser = async (user, isFailedRequest) => {
  assertPeer(user.credits >= CREDITS_FOR_SUCCESSFUL_REQUEST, `Not enough credits to make a request`, 300);
  db.makeTransaction(async (client) => {
    const requestColumn = isFailedRequest ? 'failed_requests' : 'successful_requests';
    const credits = isFailedRequest ? CREDITS_FOR_FAILED_REQUEST : CREDITS_FOR_SUCCESSFUL_REQUEST;
    const event = isFailedRequest ? 'Failed request' : 'Successful request';

    await client.query(`
      UPDATE users
        SET
          ${requestColumn} = ${requestColumn} + 1,
          credits = credits - $1
        WHERE id = $2`,
    [
      credits,
      user.id,
    ]
    );

    await client.query(`
      INSERT INTO credit_transfers (
        user_id,
        credits_spent,
        event,
        transfer_date,
        approved
      ) VALUES ($1, $2, $3, $4, $5)`,
    [
      user.id,
      credits,
      event,
      new Date(),
      true,
    ]
    );
  });
};

const getCityByIATACode = async (iataCode) => {
  iataCode = iataCode.toLowerCase();
  const options = {
    uri: AIRPORT_API_LINK,
    qs: {
      iata: iataCode,
    },
    headers: {
      'User-Agent': 'Request-Promise',
      'Access-Control-Allow-Origin': '*',
    },
    json: true, // Automatically parses the JSON string in the response
  };
  const data = await requester(options);

  if (!isObject(data) || typeof data.location !== 'string') {
    throw new PeerError('Could not find city based on given iata code', 32);
  }

  return data.location.split(',')[0];
};

app.use(router.routes());

module.exports = app;

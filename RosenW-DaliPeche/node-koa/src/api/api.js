const requester = require('request-promise');
const { trace } = require('./../debug/tracer.js');
const { assert, assertPeer } = require('./../asserts/asserts.js');
const { PeerError } = require('./../asserts/exceptions.js');
const { generateRandomString, isObject } = require('./../utils/utils.js');
const {
  MAX_API_KEYS_PER_USER,
  MAX_REQUESTS_PER_HOUR,
  AIRPORT_API_LINK,
  CREDITS_FOR_SUCCESSFUL_REQUEST,
  CREDITS_FOR_FAILED_REQUEST,
} = require('./../utils/consts.js');
const db = require('./../database/pg_db.js');

const generateAPIKey = async (ctx, next) => {
  trace(`POST '/generateKey'`);

  const username = ctx.request.body.name;
  const key = generateRandomString(16);
  const user = (await db.query(`SELECT * FROM users WHERE username = $1`, username))[0];

  assert(user != null, 'User not found when generating API key', 11);

  const APIKeyCountData = (await db.query(`SELECT COUNT(*) FROM api_keys WHERE user_id = $1`, user.id))[0];

  if (APIKeyCountData.count >= MAX_API_KEYS_PER_USER) {
    ctx.body = { msg: 'API key limit exceeded' };
  } else {
    db.query(`
      INSERT INTO api_keys (key, user_id)
        VALUES ($1, $2)`,
      key,
      user.id
    );
    ctx.body = { key };
  }
};

const deleteAPIKey = async (ctx, next) => {
  trace(`GET '/api/del/:key'`);

  const key = ctx.params.key;

  await db.query(`DELETE FROM api_keys WHERE key = $1`, key);
  ctx.redirect('/home');
};

const getForecast = async (ctx, next) => {
  trace(`POST '/api/forecast'`);

  assertPeer(isObject(ctx.request.body), 'No request body provided', 38);

  const response = {};
  const key = ctx.request.body.key;

  let iataCode = ctx.request.body.iataCode;
  let cityName = ctx.request.body.city;

  assertPeer(typeof key === 'string', 'No API key in post body', 31);

  const keyRecord = (await db.query(`SELECT * FROM api_keys WHERE key = $1`, key))[0];
  assertPeer(isObject(keyRecord), 'invalid API key', 33);

  const user = (await db.query(`SELECT * FROM users WHERE id = $1`, keyRecord.user_id))[0];
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

    const city = (await db.query(`SELECT * FROM cities WHERE LOWER(name) = LOWER($1)`, cityName))[0];
    assertPeer(isObject(city), 'no information found, please try again later', 39);

    const conditions = await db.query(`SELECT * FROM weather_conditions WHERE city_id = $1`, city.id);
    assert(Array.isArray(conditions), `expected conditions to be array but wasn't`, 14);
    assertPeer(conditions.length > 0, 'no information found, please try again later', 34);

    response.observed_at = city.observed_at;
    response.city = city.name;
    response.country_code = city.country_code;
    response.lng = city.lng;
    response.lat = city.lat;
    response.conditions = conditions;
  } catch (err) {
    if (err.statusCode === 39) db.query(`INSERT INTO cities (name) VALUES($1)`, cityName);
    if (err.statusCode !== 35) await taxUser(user, true);
    await updateRequests(iataCode, cityName);
    throw err;
  }

  await taxUser(user, false);
  await updateRequests(iataCode, cityName);

  ctx.body = response;
};

const updateAPIKeyUsage = async (keyRecord) => {
  assertPeer(
    keyRecord.use_count < MAX_REQUESTS_PER_HOUR,
    'you have exceeded your request cap, please try again later',
    35
  );

  await db.query(`UPDATE api_keys SET use_count = $1 WHERE id = $2`, keyRecord.use_count + 1, keyRecord.id);
};

const updateRequests = async (iataCode, city) => {
  const whereCol = typeof iataCode === 'string' ? 'iata_code' : 'city';
  const whereValue = typeof iataCode === 'string' ? iataCode : city;

  if (typeof iataCode !== 'string' && typeof city !== 'string') return;

  const request = (await db.query(`SELECT * FROM requests WHERE ${whereCol} = $1`, whereValue))[0];

  if (request == null) {
    await db.query(`INSERT INTO requests (${whereCol}) VALUES ($1)`, whereValue);
  } else {
    await db.query(`UPDATE requests SET call_count = $1 WHERE ${whereCol} = $2`, request.call_count + 1, whereValue);
  }
};

const taxUser = async (user, isFailedRequest) => {
  assertPeer(user.credits >= CREDITS_FOR_SUCCESSFUL_REQUEST, `Not enough credits to make a request`, 300);
  db.makeTransaction(async (client) => {
    const requestColumn = isFailedRequest ? 'failed_requests' : 'successful_requests';
    const requestsValue = isFailedRequest ? user.failed_requests + 1 : user.successful_requests + 1;
    const credits = isFailedRequest ? CREDITS_FOR_FAILED_REQUEST : CREDITS_FOR_SUCCESSFUL_REQUEST;
    const event = isFailedRequest ? 'Failed request' : 'Successful request';

    await client.query(`
      UPDATE users
        SET
          ${requestColumn} = $1,
          credits = $2
        WHERE id = $3`,
      [
        requestsValue,
        user.credits - credits,
        user.id
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
        true
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

module.exports = {
  getForecast,
  generateAPIKey,
  deleteAPIKey,
};

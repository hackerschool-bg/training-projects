const Koa = require('koa');
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const { assert, assertUser } = require('./../asserts/asserts.js');
const { AppError, PeerError, UserError } = require('./../asserts/exceptions.js');
const { trace, clearTraceLog } = require('./../debug/tracer.js');
const {
  generateRandomString,
  validateEmail,
  isObject,
  makeTransaction,
  isInteger,
} = require('./../utils/utils.js');
const { getForecast, generateAPIKey, deleteAPIKey } = require('./../api/api.js');
const db = require('./../database/pg_db.js');
const serve = require('koa-static');
const bcrypt = require('bcrypt');
const session = require('koa-session');
const views = require('koa-views');
const {
  PORT,
  MINIMUM_USERNAME_LENGTH,
  MINIMUM_PASSWORD_LENGTH,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  MAX_REQUESTS_PER_HOUR,
  MAXIMUM_CREDITS_ALLOWED,
  MERCHANT_ID,
  CREDIT_CARD_PRIVATE_KEY,
  CREDIT_CARD_PUBLIC_KEY
} = require('./../utils/consts.js');
const braintree = require('braintree');

const gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: MERCHANT_ID,
    publicKey: CREDIT_CARD_PUBLIC_KEY,
    privateKey: CREDIT_CARD_PRIVATE_KEY
});

gateway.config.timeout = 10000;

//set up merchant account

merchantAccountParams = {
    individual: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@14ladders.com",
        phone: "5553334444",
        dateOfBirth: "1981-11-19",
        ssn: "456-45-4567",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    business: {
        legalName: "Jane's Ladders",
        dbaName: "Jane's Ladders",
        taxId: "98-7654321",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    funding: {
        descriptor: "Blue Ladders",
        destination: braintree.MerchantAccount.FundingDestination.Bank,
        email: "mailsender6000@gmail.com",
        mobilePhone: "5555555555",
        accountNumber: "1123581321",
        routingNumber: "071101307"
    },
    tosAccepted: true,
    masterMerchantAccountId: "dalipeche123",
    id: "dalipeche"
};

gateway.merchantAccount.create(merchantAccountParams, function(err, result) {
  if (err) {
    console.log(`MerchantAccount Error: ${err}`);
    return;
  }
  console.log(`MerchantAccount No Error, result: ${JSON.stringify(result)}`);
});

const app = new Koa();

const server = app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});

app.keys = ['DaliKrieTaini'];

// (cookie lifetime): (Milliseconds)
app.use(session({ maxAge: 1000 * 60 * 60 * 24 }, app));

app.use(serve(`${__dirname}/public/css`));
app.use(serve(`${__dirname}/public/js`));

app.use(views(`${__dirname}/views`, {
  extension: 'hbs',
  map: { hbs: 'handlebars' }, // marks engine for extensions
  options: {
    partials: {
      adminForm: './admin_form' // requires ./admin_form.hbs
    }
  }
}));

clearTraceLog();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof UserError) {
      ctx.body = {
        message: err.message,
        statusCode: err.statusCode
      };
    } else if (err instanceof PeerError) {
      ctx.body = {
        message: err.message,
        statusCode: err.statusCode
      };
    } else {
      console.log(err);
      console.log(`Application Error: ${ err.message }, Status code: ${ err.statusCode }`);
      ctx.body = 'An error occured please clear your cookies and try again';
    }
  }
});

app.use(bodyParser());

// GET root
router.get('/', async (ctx, next) => {
  trace(`GET '/'`);

  await ctx.redirect('/home');
});

// GET logout
router.get('/logout', async (ctx, next) => {
  trace(`GET '/logout'`);

  ctx.session = null; // docs: "To destroy a session simply set it to null"
  await ctx.redirect('/login');
});

// GET home
router.get('/home', async (ctx, next) => {
  trace(`GET '/home'`);

  if (ctx.session.user == null) {
    ctx.redirect('/login');
    return next();
  }

  const user = (await db.query(`SELECT * FROM users WHERE username = $1`, ctx.session.user)).rows[0];
  assert(user != null, 'cookie contained username not in database', 10);

  const keys = (await db.query(`SELECT * FROM api_keys WHERE user_id = $1`, user.id)).rows;
  assert(Array.isArray(keys), 'keys expected to be array but wasnt', 15);

  await ctx.render(
    'home',
    {
      user: ctx.session.user,
      credits: user.credits,
      limit: MAX_REQUESTS_PER_HOUR,
      keys,
    });
});

// GET login
router.get('/login', async (ctx, next) => {
  trace(`GET '/login'`);

  if (ctx.session.user != null) {
    ctx.redirect('/home');
  }

  await ctx.render('login', {
    err: ctx.query.err,
    success: ctx.query.success,
  });
});

// GET register
router.get('/register', async (ctx, next) => {
  trace(`GET '/register'`);

  if (ctx.session.user != null) {
    ctx.redirect('/home');
  }

  await ctx.render('register', { err: ctx.query.err });
});


// GET admin
router.get('/admin', async (ctx, next) => {
  trace(`GET '/admin'`);
  if (ctx.session.admin == null) {
    await ctx.render('admin_login');
    return next();
  }

  await ctx.redirect('admin/users');
});

// GET admin/users
router.get('/admin/users', async (ctx, next) => {
  trace(`GET '/admin/users'`);

  if (ctx.session.admin == null) {
    await ctx.redirect('/admin');
    return next();
  }

  const term = ctx.query.term;

  let users;
  if (term == null) {
    users = (await db.query(`SELECT * FROM users ORDER BY id`)).rows;
  } else {
    users = (await db.query(`
      SELECT * FROM users
      WHERE LOWER(username)
      LIKE LOWER($1)
      ORDER BY id`,
      `%${term}%`
    )).rows;
  }

  users = users.map((u) => {
    u.date_registered = u.date_registered.toISOString();
    return u;
  });

  await ctx.render('admin_users', {
    users,
    maxRequests: MAX_REQUESTS_PER_HOUR,
  });
});

// GET admin/cities
router.get('/admin/cities', async (ctx, next) => {
  trace(`GET '/admin/cities'`);

  if (ctx.session.admin == null) {
    await ctx.redirect('/admin');
    return next();
  }

  const term = ctx.query.term;

  let cities;
  if (term == null) {
    cities = (await db.query(`SELECT * FROM cities`)).rows;
  } else {
    cities = (await db.query(`
      SELECT * FROM cities
      WHERE LOWER(username)
      LIKE LOWER($1)`,
      `%${term}%`
    )).rows;
  }

  cities = cities.map((c) => {
    c.observed_at = c.observed_at.toISOString();
    return c;
  })
  .sort((c1, c2) => c1.id - c2.id);

  await ctx.render('admin_cities', { cities });
});

// GET admin/requests
router.get('/admin/requests', async (ctx, next) => {
  trace(`GET '/admin/requests'`);

  if (ctx.session.admin == null) {
    await ctx.redirect('/admin');
    return next();
  }

  const term = ctx.query.term;

  let requests;
  if (term == null) {
    requests = (await db.query(`SELECT * FROM requests`)).rows;
  } else {
    requests = (await db.query(`
      SELECT * FROM requests
      WHERE LOWER(username)
      LIKE LOWER($1)`,
      `%${term}%`
    )).rows;
  }

  requests = requests.sort((c1, c2) => c2.call_count - c1.call_count);

  await ctx.render('admin_requests', { requests });
});

// GET admin/ctransfers
router.get('/admin/ctransfers', async (ctx, next) => {
  trace(`GET '/admin/ctransfers'`);

  if (ctx.session.admin == null) {
    await ctx.redirect('/admin');
    return next();
  }

  const term = ctx.query.term;

  let transfers;
  if (term == null) {
    transfers = (await db.query(`
      SELECT
        ct.id,
        transfer_date,
        username,
        credits_bought,
        credits_spent,
        event
      FROM users as u
      JOIN credit_transfers as ct
      ON ct.user_id = u.id
      ORDER BY id DESC
    `)).rows;
  } else {
    transfers = (await db.query(`
      SELECT
        id,
        transfer_date,
        username,
        credits_bought,
        credits_spent,
        event
      FROM users as u
      JOIN credit_transfers as ct
      ON ct.user_id = u.id
      WHERE LOWER(username)
      LIKE LOWER($1)
      ORDER BY ct.id DESC`,
      `%${term}%`
    )).rows;
  }

  transfers = transfers.map((t) => {
    t.transfer_date = t.transfer_date.toISOString();
    return t;
  });

  await ctx.render('admin_transfers', { transfers });
});

// GET buy
router.get('/buy', async (ctx, next) => {
  trace(`GET '/buy'`);

  const response = await gateway.clientToken.generate();

  await ctx.render('buy', {
      success: ctx.query.success,
      error: ctx.query.err,
      clientToken: response.clientToken
    }
  );
});

// POST buy
router.post('/buy', async (ctx, next) => {
  trace(`POST '/buy'`);
  // if (ctx.session.user == null) {
  //   ctx.redirect('/home');
  // }

  const sale = await gateway.transaction.sale({
    amount: "10.00",
    paymentMethodNonce: ctx.request.body.nonce,
    options: {
        submitForSettlement: true
    }
  });
  console.log(sale);

  if (sale.success) {
    console.log('ss');
  } else {
    console.log('not ss');
  }
  return;

  // assert(isObject(ctx.request.body), 'Post buy has no body', 12);

  // const credits = ctx.request.body.credits;

  // const user = (await db.query(`SELECT * FROM users WHERE username = $1`, ctx.session.user)).rows[0];
  // assert(isObject(user), 'User not an object', 13);

  // if (!isInteger(Number(credits)) || Number(credits) <= 0) {
  //   await ctx.render('buy', { error: 'Credits must be a positive whole number' });
  //   return next();
  // }

  // if (Number(credits) + Number(user.credits) > MAXIMUM_CREDITS_ALLOWED) {
  //   await ctx.render('buy', { error: 'Maximum credits allowed is 1000000 per user' });
  //   return next();
  // }

  // await addCreditsToUser(user, credits);

  // await ctx.render('buy', { credits });
});

const addCreditsToUser = async (user, credits) => {
  makeTransaction(async () => {
    await db.query(`
      UPDATE users SET credits = $1 WHERE id = $2`,
      Number(user.credits) + Number(credits),
      user.id
    );
    await db.query(`
      INSERT INTO credit_transfers (user_id, credits_bought, event, transfer_date)
        VALUES ($1, $2, $3, $4)`,
      user.id,
      credits,
      'Credit purchase',
      new Date()
    );
  });
}

// POST admin
router.post('/admin', async (ctx, next) => {
  trace(`POST '/admin'`);

  const username = ctx.request.body.username;
  const password = ctx.request.body.password;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    ctx.session.admin = true;
    return ctx.redirect('/admin/users');
  }

  await ctx.render('admin_login', { error: 'Invalid log in information' });
});

// POST register
router.post('/register', async (ctx, next) => {
  trace(`POST '/register'`);

  assertUser(
    typeof ctx.request.body.username === 'string' &&
    typeof ctx.request.body.email === 'string' &&
    typeof ctx.request.body.password === 'string' &&
    typeof ctx.request.body['repeat-password'] === 'string',
    'Invalid information',
    20
  );

  const username = ctx.request.body.username;
  const email = ctx.request.body.email.toLowerCase();
  const password = ctx.request.body.password;
  const repeatPassword = ctx.request.body['repeat-password'];

  const salt = generateRandomString(10);

  if (!validateEmail(email)) {
    await ctx.render('register', { error: 'Invalid Email'});
    return next();
  }

  if (password !== repeatPassword) {
    await ctx.render('register', { error: 'Passwords must match' });
    return next();
  }

  if (
    password.length < MINIMUM_PASSWORD_LENGTH ||
      username.length < MINIMUM_USERNAME_LENGTH
  ) {
    await ctx.render('register', { error: 'username and password must be around 4 symbols'});
    return next();
  }

  const user = (await db.query(`SELECT * FROM users WHERE username = $1 or email = $2`, username, email)).rows[0];

  if (user != null) {
    if (user.username === username) {
      await ctx.render('register', { error: 'a user with this username already exists'});
      return next();
    } else {
      await ctx.render('register', { error: 'a user with this email already exists'});
      return next();
    }
  }

  const saltedPassword = password + salt;
  const hash = await bcrypt.hash(saltedPassword, 5);

  db.query(
    `INSERT INTO users (date_registered, password, email, username, salt)
      VALUES ($1, $2, $3, $4, $5)`,
    new Date(),
    hash,
    email,
    username,
    salt
  )

  await ctx.render('login', { msg: 'Successfuly Registered' });
});

// POST login
router.post('/login', async (ctx, next) => {
  trace(`POST '/login'`);

  const username = ctx.request.body.username;
  const password = ctx.request.body.password;

  const user = (await db.query(`SELECT * FROM users where username = $1`, username)).rows[0];

  if (user == null) {
    await ctx.render('login', { error: 'No user registered with given username' });
    return next();
  }

  const saltedPassword = password + user.salt;
  const isPassCorrect = await bcrypt.compare(saltedPassword, user.password);

  if (isPassCorrect) {
    ctx.session.user = user.username;
    ctx.redirect('/home');
  } else {
    await ctx.render('login', { error: 'Invalid Password'});
  }
});

// POST generate API key
router.post('/api/generateAPIKey', generateAPIKey);

// GET delete key
router.get('/api/del/:key', deleteAPIKey);

// POST forecast
router.post('/api/forecast', getForecast);

app.use(router.routes());

module.exports = server;

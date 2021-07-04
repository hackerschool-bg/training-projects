const Koa = require('koa');
const Router = require('koa-router');
const { assert } = require('./../asserts/asserts.js');
const { trace } = require('./../debug/tracer.js');
const {
  generateRandomString,
  isObject,
  isInteger
} = require('./../utils/utils.js');
const Database = require('./../database/db.js');
const db = Database('pg');
const serve = require('koa-static');
const bcrypt = require('bcrypt');
const session = require('koa-session');
const views = require('koa-views');
const bodyParser = require('koa-bodyparser');
const {
  DEFAULT_PORT,
  MAX_REQUESTS_PER_HOUR,
  MAXIMUM_CREDITS_ALLOWED,
  ROWS_PER_PAGE,
  MINIMUM_USERNAME_LENGTH,
  MINIMUM_PASSWORD_LENGTH,
  SALT_ROUNDS,
  SALT_LENGTH,
  MAX_HTML_ROWS_WITHOUT_CONFIRMATION,
  MAXIMUM_TIME_SEARCH_INTERVAL
} = require('./../utils/consts.js');
const paths = require('./../etc/config.js');

const app = new Koa();

if (require.main === module) {
  router = new Router({
    prefix: `${paths.backOfficeMountPoint}`
  });
  const server = app.listen(DEFAULT_PORT, () => {
    console.log(`Backoffice Server listening on port: ${DEFAULT_PORT}`);
  });
  app.use(serve(`${__dirname}/public/css`));
  app.use(serve(`${__dirname}/public/js`));

  app.use(views(`${__dirname}/views`, {
    extension: 'hbs',
    map: { hbs: 'handlebars' }, // marks engine for extensions
    options: {
      partials: {
        adminForm: `./admin_form`, // requires ./admin_form.hbs
      },
    },
  }));

  app.keys = ['DaliKrieTaini'];

  // (cookie lifetime): (Milliseconds)
  app.use(session({ maxAge: 1000 * 60 * 60 * 24 }, app));

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

// GET admin
router.get('/', async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}'`);
  if (ctx.session.admin == null) {
    await ctx.render('admin_login');
    return next();
  }

  const msg = ctx.session.msg;
  delete ctx.session.msg

  await ctx.render('admin', {
    permissions: ctx.session.permissions,
    msg
  });
});

// GET users
router.get(paths.users, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.backOfficeUsers}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_users) {
    await denyAccess(ctx, next);
    return next()
  }

  if (ctx.query.search == null) {
    await ctx.render('admin_users', {
      maxRequests: MAX_REQUESTS_PER_HOUR,
      users: [],
      permissions: ctx.session.permissions,
      admin: ctx.session.username
    });
    return next();
  }

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const username = ctx.query.username == null ? '' : ctx.query.username;
  const email = ctx.query.email == null ? '' : ctx.query.email;
  const creditsFrom = ctx.query['credits-from'] == null ? 0 : Number(ctx.query['credits-from']);
  const creditsTo = ctx.query['credits-to'] == null || Number(ctx.query['credits-to']) === 0 ? MAXIMUM_CREDITS_ALLOWED : Number(ctx.query['credits-to']);
  const dateFrom = ctx.query['date-from'] == null || isNaN(new Date(ctx.query['date-from'])) ? previousYear : new Date(ctx.query['date-from']);
  const dateTo = ctx.query['date-to'] == null || isNaN(new Date(ctx.query['date-to'])) ? currentYear : new Date(ctx.query['date-to']);

  assert(typeof username === 'string', `in 'admin/user' username expected to be string, actual: ${typeof username}`, 121);
  assert(isObject(dateFrom), `in 'admin/user' dateFrom expected to be object. actual: ${typeof dateFrom}`, 122);
  assert(isObject(dateTo), `in 'admin/user' dateTo expected to be object. actual: ${typeof dateTo}`, 123);
  assert(typeof email === 'string', `in 'admin/user' email expected to be string, actual: ${typeof email}`, 124);
  assert(typeof creditsFrom === 'number', `in 'admin/user' creditsFrom expected to be number, actual: ${typeof creditsFrom}`, 125);
  assert(typeof creditsTo === 'number', `in 'admin/user' creditsTo expected to be number, actual: ${typeof creditsTo}`, 126);

  if (dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL || !username) {
    await ctx.render('admin_users', {
      maxRequests: MAX_REQUESTS_PER_HOUR,
      users: [],
      permissions: ctx.session.permissions,
      admin: ctx.session.username,
      err: dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL ? { code: 1, msg: 'Maximum time interval allowed is 1 year' } : { code: 2, msg: 'Username field must be filled' }
    });
    return next();
  }

  const users = await getUsers(username, email, creditsFrom, creditsTo, dateFrom, dateTo);

  await ctx.render('admin_users', {
    maxRequests: MAX_REQUESTS_PER_HOUR,
    users,
    username,
    email,
    creditsFrom,
    creditsTo,
    dateFrom: dateFrom.toISOString().substr(0, 10),
    dateTo: dateTo.toISOString().substr(0, 10),
    permissions: ctx.session.permissions,
    admin: ctx.session.username,
    show: users.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    search: ctx.query.search,
    resultCount: users.length
  });
});

// GET credits
router.get(paths.creditBalance, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.creditBalance}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_credit_balance) {
    await denyAccess(ctx);
  }

  if (ctx.query.search == null) {
    await ctx.render('admin_credits', {
      users: [],
      admin: ctx.session.username,
      search: ctx.query.search,
      permissions: ctx.session.permissions,
    });
    return next();
  }
  const username = ctx.query.username == null ? '' : ctx.query.username;

  if (!username) {
    await ctx.render('admin_credits', {
      users: [],
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
      err: { code: 1, msg:'Username field must be filled' }
    });
    return next();
  }

  const bundle = await getCreditBalance(username);

  await ctx.render('admin_credits', {
    users: bundle.users,
    total_credits_purchased: bundle.total.total_credits_purchased,
    total_credits_spent: bundle.total.total_credits_spent,
    total_credits_remaining: bundle.total.total_credits_remaining,
    username,
    admin: ctx.session.username,
    search: ctx.query.search,
    show: bundle.users.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    resultCount: bundle.users.length,
    permissions: ctx.session.permissions,
  });
});

// GET cities
router.get(paths.cities, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.cities}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_cities) {
    await denyAccess(ctx, next);
    return next()
  }

  if (ctx.query.search == null) {
    await ctx.render('admin_cities', {
      cities: [],
      admin: ctx.session.username,
      search: ctx.query.search,
      permissions: ctx.session.permissions,
    });
    return next();
  }

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const name = ctx.query.name == null ? '' : ctx.query.name;
  const country = ctx.query['country'] == null ? '' : ctx.query['country'];
  const dateFrom = ctx.query['date-from'] == null || isNaN(new Date(ctx.query['date-from'])) ? previousYear : new Date(ctx.query['date-from']);
  const dateTo = ctx.query['date-to'] == null || isNaN(new Date(ctx.query['date-to'])) ? currentYear : new Date(ctx.query['date-to']);

  assert(isObject(dateFrom), `in 'admin/cities' dateFrom expected to be object. actual: ${dateFrom}`, 1442);
  assert(isObject(dateTo), `in 'admin/cities' dateTo expected to be object. actual: ${dateTo}`, 1443);
  assert(typeof name === 'string', `in 'admin/cities' name expected to be string, actual: ${name}`, 141);
  assert(typeof country === 'string', `in 'admin/cities' country expected to be string, actual: ${country}`, 142);

  if (dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL || !name) {
    await ctx.render('admin_cities', {
      cities: [],
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
      err: dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL ? { code: 1, msg:'Maximum time interval allowed is 1 year' } : { code: 2, msg:'City name field must be filled' }
    });
    return next();
  }

  const cities = await getCities(name, country, dateFrom, dateTo);

  await ctx.render('admin_cities', {
    cities,
    dateFrom: dateFrom.toISOString().substr(0, 10),
    dateTo: dateTo.toISOString().substr(0, 10),
    name,
    country,
    admin: ctx.session.username,
    search: ctx.query.search,
    show: cities.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    resultCount: cities.length,
    permissions: ctx.session.permissions,
  });
});

// GET requests
router.get(paths.requests, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.requests}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_requests) {
    await denyAccess(ctx, next);
    return next()
  }

  const term = ctx.query.term == null ? '' : ctx.query.term;

  if (ctx.query.search == null) {
    await ctx.render('admin_requests', {
      requests: [],
      term,
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
    });
    return next();
  }

  if (!term) {
    await ctx.render('admin_requests', {
      requests: [],
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
      err: { code: 1, msg:'IATA Code / City field must be filled' }
    });
    return next();
  }

  const requests = await getRequests(term);

  await ctx.render('admin_requests', {
    requests,
    term,
    admin: ctx.session.username,
    search: ctx.query.search,
    show: requests.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    resultCount: requests.length,
    permissions: ctx.session.permissions,
  });
});

// GET add credits
router.get(paths.add, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.add}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_add_credits) {
    await denyAccess(ctx, next);
    return next()
  }

  if (ctx.query.search == null) {
    await ctx.render('admin_add_credits', {
      users: [],
      permissions: ctx.session.permissions,
      admin: ctx.session.username
    });
    return next();
  }

  const username = ctx.query.username == null ? '' : ctx.query.username;
  assert(typeof username === 'string', `in 'admin/add-credits' username expected to be string, actual: ${typeof username}`, 1218);

  const users = await db.sql(`
    SELECT *
    FROM users
    WHERE
      UNACCENT(LOWER(username)) LIKE LOWER($1)
    ORDER BY id`,
  `%${username}%`
  );

  await ctx.render('admin_add_credits', {
    users,
    username,
    admin: ctx.session.username,
    permissions: ctx.session.permissions,
    show: users.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    search: ctx.query.search,
    resultCount: users.length
  });
});

// GET create user
router.get(paths.backOfficeCreateUser, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.backOfficeCreateUser}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_edit_backoffice_users) {
    await denyAccess(ctx, next);
    return next()
  }

  const roles = await db.sql(`SELECT * FROM roles ORDER BY id`);
  const error = ctx.session.error != null ? ctx.session.error : '';
  delete ctx.session.error;
  const msg = ctx.session.msg != null ? ctx.session.msg : '';
  delete ctx.session.msg;

  await ctx.render('admin_create_user', {
    roles,
    error,
    msg,
    admin: ctx.session.username,
    permissions: ctx.session.permissions,
  });
});

// POST create user
router.post(paths.backOfficeCreateUser, async (ctx, next) => {
  trace(`POST '${paths.backOfficeMountPoint}/${paths.backOfficeCreateUser}'`);

  assert(
    typeof ctx.request.body.username === 'string' &&
    typeof ctx.request.body.password === 'string' &&
    typeof ctx.request.body['repeat-password'] === 'string',
    typeof ctx.request.body['select-role'] === 'string',
    'Invalid information',
    199
  );

  const role = ctx.request.body['select-role'];
  const username = ctx.request.body.username;
  const password = ctx.request.body.password;
  const repeatPassword = ctx.request.body['repeat-password'];

  const salt = generateRandomString(SALT_LENGTH);

  if (password !== repeatPassword) {
    ctx.session.error = 'Passwords must match';
    await ctx.redirect(`${paths.backOfficeMountPoint}${paths.backOfficeCreateUser}`);
    return next();
  }

  if (
    password.length < MINIMUM_PASSWORD_LENGTH ||
      username.length < MINIMUM_USERNAME_LENGTH
  ) {
    ctx.session.error = 'Username and password must be at least 3 symbols';
    await ctx.redirect(`${paths.backOfficeMountPoint}${paths.backOfficeCreateUser}`);
    return next();
  }

  const user = (await db.sql(`SELECT * FROM backoffice_users WHERE username = $1`, username))[0];

  if (user != null && user.username === username) {
    ctx.session.error = 'A user with this username already exists';
    await ctx.redirect(`${paths.backOfficeMountPoint}${paths.backOfficeCreateUser}`);
    return next();
  }

  const saltedPassword = password + salt;
  const hash = await bcrypt.hash(saltedPassword, SALT_ROUNDS);

  const newRecord = (await db.sql(
    `INSERT INTO backoffice_users (password, username, salt)
      VALUES ($1, $2, $3)
      RETURNING id`,
    hash,
    username,
    salt
  ))[0];

  await db.sql(`
    INSERT INTO backoffice_users_roles (backoffice_user_id, role_id)
      VALUES ($1, $2)`,
    newRecord.id,
    role
  );

  ctx.session.msg = 'Successfuly Registered User';
  await ctx.redirect(`${paths.backOfficeMountPoint}${paths.backOfficeCreateUser}`);
  return next();
});

// GET roles
router.get(paths.roles, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.roles}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_roles) {
    await denyAccess(ctx, next);
    return next()
  }

  const roles = await db.sql(`SELECT * FROM roles ORDER BY id`);

  const msg = ctx.session.msg != null ? ctx.session.msg : '';
  delete ctx.session.msg;

  await ctx.render('admin_roles', {
    roles,
    permissions: ctx.session.permissions,
    msg,
    admin: ctx.session.username
  });
});

// DELETE role
router.del('/role', async (ctx, next) => {
  trace(`DELETE '/del'`);

  const role = ctx.request.body.role;

  try {
    await db.sql(`DELETE FROM roles WHERE role = $1`, role);
    ctx.body = { msg: 'Successfuly deleted role' };
  } catch (err) {
    console.log(err);
    ctx.body = { err: `Deletion failed: Some users are still assigned to this role` };
  }
});

// GET backoffice-users
router.get(paths.backOfficeUsers, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.backOfficeUsers}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_edit_backoffice_users) {
    await denyAccess(ctx, next);
    return next()
  }

  const username = ctx.query.username == null ? '' : ctx.query.username;

  const roles = await db.sql(`SELECT id, role FROM roles ORDER BY id`);

  const users = await db.sql(`
    SELECT *
    FROM backoffice_users
    WHERE
      LOWER(username) LIKE LOWER($1)
    ORDER BY id`,
  `%${username}%`
  );

  const msg = ctx.session.msg != null ? ctx.session.msg : '';
  delete ctx.session.msg;

  await ctx.render('admin_backoffice_users', {
    users,
    roles,
    username,
    permissions: ctx.session.permissions,
    msg,
    admin: ctx.session.username
  });
});

// POST backoffice-users
router.post(paths.backOfficeUsers, async (ctx, next) => {
  assert(isObject(ctx.session), 'No session in post /backoffice-users', 192);
  assert(isObject(ctx.session.permissions), 'No permissions in post /backoffice-users', 193);

  if (!ctx.session.permissions.can_edit_backoffice_users) {
    ctx.redirect(`${paths.backOfficeMountPoint}${paths.roles}`);
    return;
  }

  assert(isObject(ctx.request.body), 'Post /backoffice-users has no body', 194);
  assert(typeof ctx.request.body.username === 'string' , 'Post /backoffice-users has no username', 195);

  await db.makeTransaction(async (client) => {
    const user = (await client.query(`
      SELECT * FROM backoffice_users
        WHERE username = $1
      `,
    [
      ctx.request.body.username
    ]
    )).rows[0];

    assert(isObject(user), `User in /backoffice-users expected to be object but wasn't`, 1961);
    assert(typeof user.id === 'number' , 'Username in /backoffice-users has no id', 1962);

    await client.query(`DELETE FROM backoffice_users_roles WHERE backoffice_user_id = $1`, [ user.id ]);

    const rolesArr = [];
    for (const role of Object.keys(ctx.request.body)) {
      if (role === 'username') continue;

      const roleId = (await client.query(`SELECT * FROM roles WHERE role = $1`, [ role ])).rows[0].id;
      rolesArr.push(roleId);
    }

    for (const roleId of rolesArr) {
      await client.query(`
        INSERT INTO backoffice_users_roles (backoffice_user_id, role_id)
          VALUES ($1, $2)`,
      [
        user.id,
        roleId
      ]
      )
    }
  });

  ctx.session.msg = `Successfuly updated user's role`;
  ctx.redirect(`${paths.backOfficeMountPoint}${paths.backOfficeUsers}`);
});

// POST get-user-roles
router.post('/get-user-roles', async (ctx, next) => {
  if (!ctx.session.permissions.can_edit_backoffice_users) {
    ctx.body = {err: `You don't have permission for this action`}
    return;
  }

  const username = ctx.request.body.username;

  assert(typeof username === 'string', 'Post /get-user-roles has no username', 1222);

  const roles = await db.sql(`
    SELECT r.role FROM backoffice_users AS bu
    JOIN backoffice_users_roles AS bur
      ON bu.id = bur.backoffice_user_id
    JOIN roles AS r
      ON r.id = bur.role_id
    WHERE bu.username = $1
  `,
  username
  );

  ctx.body = { roles };
});

// POST add-role
router.post('/add-role', async (ctx, next) => {
  if (!ctx.session.permissions.can_change_role_permissions) {
    ctx.body = {err: `You don't have permission to add a role`}
    return;
  }

  db.sql(`INSERT INTO roles (role) VALUES ('')`);
  ctx.body = {msg: `Successfuly added new role`};
});

// GET ctransfers
router.get(paths.creditTransfers, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.creditTransfers}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_transfers) {
    await denyAccess(ctx, next);
    return next()
  }

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const username = ctx.query.username == null ? '' : ctx.query.username;
  const dateGroupByValue = ctx.query['date-group-by'] == null ? '' : ctx.query['date-group-by'];
  const dateFrom = ctx.query['date-from'] == null || isNaN(new Date(ctx.query['date-from'])) ? previousYear : new Date(ctx.query['date-from']);
  const dateTo = ctx.query['date-to'] == null || isNaN(new Date(ctx.query['date-to'])) ? currentYear : new Date(ctx.query['date-to']);
  const event = ctx.query.event == null ? '' : ctx.query.event;

  assert(typeof username === 'string', `in 'admin/ctransfers' username expected to be string, actual: ${typeof username}`, 131);
  assert(typeof dateGroupByValue === 'string', `in 'admin/ctransfers' dateGroupByValue expected to be string, actual: ${typeof dateGroupByValue}`, 1319);
  assert(isObject(dateFrom), `in 'admin/ctransfers' dateFrom expected to be object. actual: ${dateFrom}`, 132);
  assert(isObject(dateTo), `in 'admin/ctransfers' dateTo expected to be object. actual: ${dateTo}`, 133);
  assert(typeof event === 'string', `in 'admin/ctransfers' event expected to be string, actual: ${event}`, 134);

  if (ctx.query.search == null) {
    await ctx.render('admin_transfers', {
      transfers: [],
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
      search: ctx.query.search
    });
    return next();
  }

  if (dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL || !username) {
    await ctx.render('admin_transfers', {
      transfers: [],
      admin: ctx.session.username,
      permissions: ctx.session.permissions,
      err: dateTo - dateFrom > MAXIMUM_TIME_SEARCH_INTERVAL ? { code: 1, msg:'Maximum time interval allowed is 1 year' } : { code: 2, msg:'Username field must be filled' }
    });
    return next();
  }

  bundle = await getCreditTransfers(username, event, dateFrom, dateTo, dateGroupByValue);

  await ctx.render('admin_transfers', {
    transfers: bundle.transfers,
    total: bundle.total,
    username,
    event,
    dateFrom: dateFrom.toISOString().substr(0, 10),
    dateTo: dateTo.toISOString().substr(0, 10),
    dateGroupByValue,
    admin: ctx.session.username,
    show: bundle.transfers.length < MAX_HTML_ROWS_WITHOUT_CONFIRMATION || ctx.query.show != null,
    resultCount: bundle.transfers.length,
    search: ctx.query.search,
    permissions: ctx.session.permissions,
  });
});

// POST add credits
router.post('/addCreditsToUser', async (ctx, next) => {
  assert(isObject(ctx.request.body), 'Post /addCredits has no body', 19);

  if (!ctx.session.permissions.can_add_credits) {
    return;
  }

  const username = ctx.request.body.username;
  const credits = ctx.request.body.credits;

  assert(username != null, 'No username in post /addCredits', 101);
  assert(credits != null, 'No credits in post /addCredits', 102);

  if (credits > 1000000) {
    ctx.body = { err: 'Credits Must be under 1,000,000' };
    return next();
  }

  await db.makeTransaction(async (client) => {
    const user = (await client.query(`SELECT * FROM users WHERE username = $1`, [ username ])).rows[0];
    await client.query(`
      UPDATE users SET credits = $1 WHERE username = $2`,
    [
      Number(user.credits) + Number(credits),
      username,
    ]
    );
    await client.query(`
      INSERT INTO credit_transfers (user_id, credits_received, event, transfer_date)
        VALUES ($1, $2, $3, $4)
    `,
    [
      user.id,
      credits,
      `Credits given by admin: ${ctx.session.username}`,
      new Date(),
    ]
    );
  });

  ctx.body = { msg: `Successfuly added ${credits} credits to user ${username}` };
});

// POST approve transfer
router.post(paths.approveTransfers, async (ctx, next) => {
  assert(isObject(ctx.session), 'No session in post /approve', 180);
  assert(isObject(ctx.session.permissions), 'No permissions in post /approve', 181);

  if (!ctx.session.permissions.can_approve_credits) {
    return;
  }

  assert(isObject(ctx.request.body), 'Post /approve has no body', 103);
  assert(typeof ctx.request.body.id === 'string' && isInteger(Number(ctx.request.body.id)), 'Post /approve body has no id', 104);

  const id = ctx.request.body.id;

  assert(id != null, 'No id in post /approve', 105);

  await db.makeTransaction(async (client) => {
    const transfer = (await client.query('SELECT * FROM credit_transfers WHERE id = $1', [ id ])).rows[0];
    assert(isObject(transfer), 'Post /approve transfer not found', 106);
    const user = (await client.query('SELECT * FROM users WHERE id = $1', [ transfer.user_id ])).rows[0];
    assert(isObject(user), 'Post /approve user not found', 107);
    await client.query(`UPDATE users SET credits = $1 WHERE id = $2`, [ Number(transfer.credits_received) + Number(user.credits), transfer.user_id ]);
    await client.query(`UPDATE credit_transfers SET approved = true WHERE id = $1`, [ transfer.id ]);
  });

  ctx.body = {isApproveSuccessful: true};
});

// POST xlsx requests
router.post('/xlsx/requests', async (ctx, next) => {
  const filters = ctx.request.body.filters

  assert(isObject(ctx.session), 'No session in post /xlsx/requests', 1777);
  assert(isObject(ctx.session.permissions), 'No permissions in post /xlsx/requests', 1778);
  assert(isObject(ctx.request.body), 'Post /xlsx/requests has no body', 1779);
  assert(isObject(filters), 'Post /xlsx/requests has no filters', 1780);
  assert(typeof filters.term === 'string', `Post /xlsx/requests term expected to be string but was ${typeof filters.term}`, 1781);

  const term = filters.term;

  const requests = await getRequests(term);

  let table = '<tr><th>Request</th><th>Type</th><th>Call Count</th></tr>';

  for (const req of requests) {
    for (let [key, value] of Object.entries(req)) {
      if (value == null) req[key] = '';
    }
    table += `<tr><td>${req.request}</td><td>${req.type}</td><td>${req.call_count}</td></tr>`
  }

  ctx.body = { table };
});

// POST xlsx credits
router.post('/xlsx/credits', async (ctx, next) => {
  const filters = ctx.request.body.filters

  assert(isObject(ctx.session), 'No session in post /xlsx/credits', 1877);
  assert(isObject(ctx.session.permissions), 'No permissions in post /xlsx/credits', 1878);
  assert(isObject(ctx.request.body), 'Post /xlsx/credits has no body', 1879);
  assert(isObject(filters), 'Post /xlsx/credits has no filters', 1880);
  assert(typeof filters.username === 'string', `Post /xlsx/credits username expected to be string but was ${typeof filters.username}`, 1881);

  const username = filters.username;

  const bundle = await getCreditBalance(username);

  let table = '<tr><th>ID</th><th>User</th><th>Credits Purchased</th><th>Credits Spent</th><th>Credits Remaining</th></tr>';

  for (const u of bundle.users) {
    for (let [key, value] of Object.entries(u)) {
      if (value == null) u[key] = '';
    }
    table += `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.credits_purchased}</td><td>${u.credits_spent}</td><td>${u.credits_remaining}</td></tr>`
  }

  table += `<tr><td>Total</td><td></td><td>${bundle.total.total_credits_purchased}</td><td>$${bundle.total.total_credits_spent}</td><td>${bundle.total.total_credits_remaining}</td></tr>`

  ctx.body = { table };
});

// POST xlsx cities
router.post('/xlsx/cities', async (ctx, next) => {
  const filters = ctx.request.body.filters

  assert(isObject(ctx.session), 'No session in post /xlsx/cities', 1977);
  assert(isObject(ctx.session.permissions), 'No permissions in post /xlsx/cities', 1978);
  assert(isObject(ctx.request.body), 'Post /xlsx/cities has no body', 1979);
  assert(isObject(filters), 'Post /xlsx/cities has no filters', 1980);

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const name = filters.city == null ? '' : filters.city;
  const country = filters.country == null ? '' : filters.country;
  const dateFrom = filters.dateFrom == null || isNaN(new Date(filters.dateFrom)) ? previousYear : new Date(filters.dateFrom);
  const dateTo = filters.dateTo == null || isNaN(new Date(filters.dateTo)) ? currentYear : new Date(filters.dateTo);

  assert(isObject(dateFrom), `in 'xlsx/cities' dateFrom expected to be object. actual: ${typeof dateFrom}`, 1981);
  assert(isObject(dateTo), `in 'xlsx/cities' dateTo expected to be object. actual: ${typeof dateTo}`, 1982);
  assert(typeof name === 'string', `in 'xlsx/cities' name expected to be string, actual: ${typeof name}`, 1983);
  assert(typeof country === 'string', `in 'xlsx/cities' country expected to be string, actual: ${typeof country}`, 1984);

  const cities = await getCities(name, country, dateFrom, dateTo);

  let table = '<tr><th>ID</th><th>Name</th><th>Country</th><th>Longitude</th><th>Latitude</th><th>Observed at</th></tr>';

  for (const c of cities) {
    for (let [key, value] of Object.entries(c)) {
      if (value == null) c[key] = '';
    }
    table += `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.country}</td><td>${c.lng}</td><td>${c.lat}</td><td>${c.observed_at}</td></tr>`
  }

  ctx.body = { table };
});

// POST xlsx users
router.post('/xlsx/users', async (ctx, next) => {
  assert(isObject(ctx.session), 'No session in post /xlsx/users', 2077);
  assert(isObject(ctx.session.permissions), 'No permissions in post /xlsx/users', 2078);
  assert(isObject(ctx.request.body), 'Post /xlsx/users has no body', 2079);
  assert(isObject(ctx.request.body.filters), 'Post /xlsx/users has no filters', 2080);

  const filters = ctx.request.body.filters;

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const username = filters.username == null ? '' : filters.username;
  const dateFrom = filters.dateFrom == null || isNaN(new Date(filters.dateFrom)) ? previousYear : new Date(filters.dateFrom);
  const dateTo = filters.dateTo == null || isNaN(new Date(filters.dateTo)) ? currentYear : new Date(filters.dateTo);
  const email = filters.email == null ? '' : filters.email;
  const creditsFrom = filters.creditsFrom == null ? 0 : Number(filters.creditsFrom);
  const creditsTo = filters.creditsTo == null || Number(filters.creditsTo) === 0 ? MAXIMUM_CREDITS_ALLOWED : Number(filters.creditsTo);

  assert(typeof username === 'string', `in 'xlsx/user' username expected to be string, actual: ${typeof username}`, 2081);
  assert(isObject(dateFrom), `in 'xlsx/users' dateFrom expected to be object. actual: ${typeof dateFrom}`, 2082);
  assert(isObject(dateTo), `in 'xlsx/users' dateTo expected to be object. actual: ${typeof dateTo}`, 2083);
  assert(typeof email === 'string', `in 'xlsx/user' email expected to be string, actual: ${typeof email}`, 2084);
  assert(typeof creditsFrom === 'number', `in 'xlsx/user' creditsFrom expected to be number, actual: ${typeof creditsFrom}`, 2085);
  assert(typeof creditsTo === 'number', `in 'xlsx/user' creditsTo expected to be number, actual: ${typeof creditsTo}`, 2086);

  const users = await getUsers(username, email, creditsFrom, creditsTo, dateFrom, dateTo);

  let table = '<tr><th>ID</th><th>Date Registered</th><th>User</th><th>Email</th><th>Successful Requests</th><th>Failed Requests</th><th>Credits</th></tr>';

  for (const u of users) {
    for (let [key, value] of Object.entries(u)) {
      if (value == null) u[key] = '';
    }
    table += `<tr><td>${u.id}</td><td>${u.date_registered}</td><td>${u.username}</td><td>${u.email}</td><td>${u.successful_requests}</td><td>${u.failed_requests}</td><td>${u.credits}</td></tr>`
  }

  ctx.body = { table };
});

// POST xlsx ctransfers
router.post('/xlsx/ctransfers', async (ctx, next) => {
  assert(isObject(ctx.session), 'No session in post /xlsx/users', 2177);
  assert(isObject(ctx.session.permissions), 'No permissions in post /xlsx/users', 2178);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_transfers) {
    await denyAccess(ctx, next);
    return next()
  }

  assert(isObject(ctx.request.body), 'Post /xlsx/users has no body', 2179);
  assert(isObject(ctx.request.body.filters), 'Post /xlsx/users has no filters', 2180);
  const filters = ctx.request.body.filters;

  let currentYear = new Date();
  let previousYear = new Date();
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  const username = filters.username == null ? '' : filters.username;
  const dateGroupByValue = filters.dateGroupByValue == null ? '' : filters.dateGroupByValue;
  const dateFrom = filters.dateFrom == null || isNaN(new Date(filters.dateFrom)) ? previousYear : new Date(filters.dateFrom);
  const dateTo = filters.dateTo == null || isNaN(new Date(filters.dateTo)) ? currentYear : new Date(filters.dateTo);
  const event = filters.event == null ? '' : filters.event;

  assert(typeof username === 'string', `in 'admin/ctransfers' username expected to be string, actual: ${typeof username}`, 2181);
  assert(typeof dateGroupByValue === 'string', `in 'admin/ctransfers' dateGroupByValue expected to be string, actual: ${typeof dateGroupByValue}`, 2182);
  assert(isObject(dateFrom), `in 'admin/ctransfers' dateFrom expected to be object. actual: ${dateFrom}`, 2183);
  assert(isObject(dateTo), `in 'admin/ctransfers' dateTo expected to be object. actual: ${dateTo}`, 2184);
  assert(typeof event === 'string', `in 'admin/ctransfers' event expected to be string, actual: ${event}`, 2185);

  bundle = await getCreditTransfers(username, event, dateFrom, dateTo, dateGroupByValue);

  let table = '<tr><th>ID</th><th>Transfer Date</th><th>User</th><th>Event</th><th>Credits Received</th><th>Credits Spent</th></tr>';

  for (const t of bundle.transfers) {
    for (let [key, value] of Object.entries(t)) {
      if (value == null) t[key] = '';
    }
    table += `<tr><td>${t.id}</td><td>${t.transfer_date}</td><td>${t.username}</td><td>${t.event}</td><td>${t.credits_received}</td><td>${t.credits_spent}</td></tr>`;
  }
  table += `<tr><td>Total</td><td></td><td></td><td></td><td>${bundle.total.total_received}</td><td>${bundle.total.total_spent}</td></tr>`

  ctx.body = { table };
});

async function getCreditBalance (username) {
  const users = await db.sql(`
    SELECT
      u.id,
      u.username,
      SUM(ct.credits_received) AS credits_purchased,
      SUM(ct.credits_spent) AS credits_spent,
      u.credits AS credits_remaining
    FROM users AS u
    JOIN credit_transfers AS ct
    ON ct.user_id = u.id
    WHERE UNACCENT(LOWER(u.username)) LIKE LOWER($1)
    GROUP BY (u.id, u.username, u.credits)
    ORDER BY u.id
  `,
  `%${username}%`
  );

  const total = (await db.sql(`
    SELECT
      SUM(credits_purchased) AS total_credits_purchased,
      SUM(credits_spent) AS total_credits_spent,
      SUM(credits_remaining) AS total_credits_remaining
    FROM (
      SELECT
        u.id,
        u.username,
        SUM(ct.credits_received) AS credits_purchased,
        SUM(ct.credits_spent) AS credits_spent,
        u.credits AS credits_remaining
      FROM users AS u
      JOIN credit_transfers AS ct
      ON ct.user_id = u.id
      WHERE UNACCENT(LOWER(u.username)) LIKE LOWER($1)
      GROUP BY (u.id, u.username, u.credits)
      ORDER BY u.id) AS total_by_user;
    `,
  `%${username}%`,
  ))[0];

  return { users, total }
}

async function getCities (name, country, dateFrom, dateTo) {
  dateTo.setDate(dateTo.getDate() + 1); // include chosen day

  const cities = (await db.sql(`
    SELECT c.*, ctr.name as country
    FROM cities as c
    JOIN countries as ctr
      ON c.country_code = ctr.country_code
    WHERE
      UNACCENT(LOWER(c.name)) LIKE LOWER($1)
      AND LOWER(ctr.name) LIKE LOWER($2)
      AND (c.observed_at BETWEEN $3 AND $4)
    ORDER BY id`,
  `%${name}%`,
  `%${country}%`,
  dateFrom,
  dateTo
  )).map((c) => {
    if (c.observed_at != null) c.observed_at = c.observed_at.toISOString().replace('T', ' ').slice(0, -5);
    return c;
  }).sort((c1, c2) => c1.id - c2.id);

  dateTo.setDate(dateTo.getDate() - 1); // show original date

  return cities;
}

async function getRequests (term) {
  const requests = (await db.sql(`
    SELECT * FROM requests
    WHERE
    LOWER(iata_code) LIKE LOWER($1)
    OR UNACCENT(LOWER(city)) LIKE LOWER($1)
    ORDER BY id`,
  `%${term}%`,
  )).sort((c1, c2) => c2.call_count - c1.call_count)
    .map((r) => {
      const request = r.city ? r.city : r.iata_code;
      const type = r.city ? 'City' : 'Airport IATA Code';
      return {
        request,
        type,
        call_count: r.call_count
      }
  });
  return requests;
}

async function getUsers (username, email, creditsFrom, creditsTo, dateFrom, dateTo) {
  dateTo.setDate(dateTo.getDate() + 1); // include chosen day

  const users = (await db.sql(`
    SELECT *
    FROM users
    WHERE
      UNACCENT(LOWER(username)) LIKE LOWER($1)
      AND LOWER(email) LIKE LOWER($2)
      AND (date_registered BETWEEN $3 AND $4)
      AND (credits BETWEEN $5 AND $6)
    ORDER BY id`,
  `%${username}%`,
  `%${email}%`,
  dateFrom,
  dateTo,
  creditsFrom,
  creditsTo
  )).map((u) => {
    u.date_registered = u.date_registered.toISOString().replace('T', ' ').slice(0, -5);
    return u;
  });

  dateTo.setDate(dateTo.getDate() - 1); // show original date

  return users;
}

async function getCreditTransfers (username, event, dateFrom, dateTo, dateGroupByValue) {
  dateTo.setDate(dateTo.getDate() + 1); // include chosen day

  let selectValues = '';
  let dateGroupByValues = {
    all: 'transfer_date',
    day: 'DATE(transfer_date)',
    month: `TO_CHAR(transfer_date, 'YYYY-MM')`,
    year: `TO_CHAR(transfer_date, 'YYYY')`,
  }

  let dateGroupBySQL = dateGroupByValues[dateGroupByValue]

  selectValues += dateGroupByValue === 'all' ? 'ct.id, ' : '';
  selectValues += `${dateGroupBySQL} AS transfer_date, `;
  selectValues += dateGroupByValue === 'all' ? 'username, ' : '';
  selectValues += dateGroupByValue === 'all' ? 'credits_received, ' : 'SUM(ct.credits_received) AS credits_received, ';
  selectValues += dateGroupByValue === 'all' ? 'credits_spent, ' : 'SUM(ct.credits_spent) AS credits_spent, ';
  selectValues += dateGroupByValue === 'all' ? 'event, ' : '';
  selectValues = selectValues.substr(0, selectValues.length - 2); // removes trailing , from select

  let groupByValues = ``;
  groupByValues += dateGroupByValue === 'all' ? '' : dateGroupBySQL;

  if (groupByValues.length > 0) {
    groupByValues = `GROUP BY ${groupByValues}`
  }

  const query = `
    SELECT
      ${selectValues}
    FROM users AS u
    JOIN credit_transfers as ct
      ON ct.user_id = u.id
    WHERE
      UNACCENT(LOWER(username)) LIKE LOWER($1)
      AND LOWER(event) LIKE LOWER($2)
      AND (ct.transfer_date BETWEEN $3 AND $4)
      AND approved = true
    ${groupByValues}
    ORDER BY ${dateGroupBySQL}
  `;

  const transfers = (await db.sql(
    query,
  `%${username}%`,
  `%${event}%`,
  dateFrom,
  dateTo
  )).map((t) => {
    if (dateGroupByValue === 'all') {
      t.transfer_date = t.transfer_date.toISOString().replace('T', ' ').slice(0, -5);
    } else {
      if (isObject(t.transfer_date)) {
        t.transfer_date.setDate(t.transfer_date.getDate() + 1);
        t.transfer_date = t.transfer_date.toISOString().substr(0, 10);
      }
      t.id = 'all';
      t.username = 'all';
      t.event = 'all';
    }
    return t;
  });

  const total = (await db.sql(`
    SELECT
      SUM(credits_received) AS total_received,
      SUM(credits_spent) AS total_spent
    FROM (${query}) as subq`,
  `%${username}%`,
  `%${event}%`,
  dateFrom,
  dateTo
  ))[0];

  dateTo.setDate(dateTo.getDate() - 1); // show original date
  return { transfers, total }
}

// POST roles
router.post(paths.roles, async (ctx, next) => {
  assert(isObject(ctx.session), 'No session in post /roles', 182);
  assert(isObject(ctx.session.permissions), 'No permissions in post /roles', 183);

  if (!ctx.session.permissions.can_change_role_permissions) {
    ctx.redirect(`${paths.backOfficeMountPoint}${paths.roles}`);
    return;
  }

  assert(isObject(ctx.request.body), 'Post /roles has no body', 184);
  assert(typeof ctx.request.body.role === 'string', 'Post /roles body has no role', 185);

  const role = ctx.request.body.role;
  const oldRole = ctx.request.body['old-role'];
  const seeUsers = ctx.request.body.can_see_users === 'on';
  const addCredits = ctx.request.body.can_add_credits === 'on';
  const seeTransfers = ctx.request.body.can_see_transfers === 'on';
  const seeCities = ctx.request.body.can_see_cities === 'on';
  const seeRequests = ctx.request.body.can_see_requests === 'on';
  const seeBalance = ctx.request.body.can_see_credit_balance === 'on';
  const seeApproval = ctx.request.body.can_see_credits_for_approval === 'on';
  const canApprove = ctx.request.body.can_approve_credits === 'on';
  const seeRoles = ctx.request.body.can_see_roles === 'on';
  const changePermissions = ctx.request.body.can_change_role_permissions === 'on';
  const editBackofficeUsers = ctx.request.body.can_edit_backoffice_users === 'on';
  const seeBackofficeUsers = ctx.request.body.can_see_backoffice_users === 'on';

  await db.sql(`
    UPDATE roles
      SET
        role = $14,
        can_see_users = $1,
        can_add_credits = $2,
        can_see_transfers = $3,
        can_see_cities = $4,
        can_see_requests = $5,
        can_see_credit_balance = $6,
        can_see_credits_for_approval = $7,
        can_approve_credits = $8,
        can_see_roles = $9,
        can_change_role_permissions = $10,
        can_see_backoffice_users = $11,
        can_edit_backoffice_users = $12
      WHERE
        role = $13
    `,
    seeUsers,
    addCredits,
    seeTransfers,
    seeCities,
    seeRequests,
    seeBalance,
    seeApproval,
    canApprove,
    seeRoles,
    changePermissions,
    seeBackofficeUsers,
    editBackofficeUsers,
    oldRole,
    role
  );

  ctx.session.msg = `Successfuly Changed the ${oldRole} Role`;
  await ctx.redirect(`${paths.backOfficeMountPoint}${paths.roles}`);
});

// POST admin
router.post('/', async (ctx, next) => {
  trace(`POST '/${paths.backOfficeMountPoint}'`);

  assert(isObject(ctx.request.body), 'Post /admin has no body', 108);

  const username = ctx.request.body.username;
  const password = ctx.request.body.password;

  assert(typeof ctx.request.body.username === 'string', 'Post /admin body has no username', 109);
  assert(typeof ctx.request.body.password === 'string', 'Post /admin body has no password', 110);

  const user = (await db.sql(`
    SELECT u.salt, u.password FROM roles AS r
      JOIN backoffice_users_roles AS ur
      ON r.id = ur.role_id
      JOIN backoffice_users AS u
      ON u.id = ur.backoffice_user_id
      WHERE u.username = $1;
    `, username
  ))[0];

  if (user == null) {
    await ctx.render('admin_login', { error: 'Invalid log in information' });
    return next();
  }

  assert(isObject(user), 'Post /admin user not found', 111);

  const saltedPassword = password + user.salt;
  const isPassCorrect = await bcrypt.compare(saltedPassword, user.password);

  if (!isPassCorrect) {
    await ctx.render('admin_login', { error: 'No user registered with given username' });
    return next();
  }

  ctx.session.admin = true;
  ctx.session.username = username;
  const roles = await db.sql(`
    SELECT * FROM roles AS r
      JOIN backoffice_users_roles AS ur
      ON r.id = ur.role_id
      JOIN backoffice_users AS u
      ON u.id = ur.backoffice_user_id
      WHERE u.username = $1;
    `, username
  );

  ctx.session.permissions = {};

  for (const role of roles) {
    ctx.session.permissions.id = role.id;
    ctx.session.permissions.roles = ctx.session.permissions.roles == null ? role.role : `${ctx.session.permissions.roles}, ${role.role}`;
    if (role.can_see_users) ctx.session.permissions.can_see_users = true;
    if (role.can_add_credits) ctx.session.permissions.can_add_credits = true;
    if (role.can_see_transfers) ctx.session.permissions.can_see_transfers = true;
    if (role.can_see_cities) ctx.session.permissions.can_see_cities = true;
    if (role.can_see_requests) ctx.session.permissions.can_see_requests = true;
    if (role.can_see_credit_balance) ctx.session.permissions.can_see_credit_balance = true;
    if (role.can_see_credits_for_approval) ctx.session.permissions.can_see_credits_for_approval = true;
    if (role.can_approve_credits) ctx.session.permissions.can_approve_credits = true;
    if (role.can_see_roles) ctx.session.permissions.can_see_roles = true;
    if (role.can_change_role_permissions) ctx.session.permissions.can_change_role_permissions = true;
    if (role.can_see_backoffice_users) ctx.session.permissions.can_see_backoffice_users = true;
    if (role.can_edit_backoffice_users) ctx.session.permissions.can_edit_backoffice_users = true;
  }

  assert(isObject(ctx.session.permissions), 'Post /admin user has no permissions', 112);
  return ctx.redirect(`${paths.backOfficeMountPoint}${paths.users}`);

  await ctx.render('/admin_login', { error: 'Invalid log in information' });
});

// GET approve
router.get(paths.approveTransfers, async (ctx, next) => {
  trace(`GET '/${paths.backOfficeMountPoint}/${paths.approveTransfers}'`);

  if (!isObject(ctx.session.permissions) || !ctx.session.permissions.can_see_credits_for_approval) {
    await denyAccess(ctx, next);
    return next()
  }

  const username = ctx.query.username == null ? '' : ctx.query.username;
  const page = !Number(ctx.query.page) || ctx.query.page < 0 ? 0 : Number(ctx.query.page);

  const transfers = (await db.sql(`
    SELECT
      ct.id,
      u.username,
      ct.credits_received
    FROM users as u
    JOIN credit_transfers as ct
    ON ct.user_id = u.id
    WHERE
      UNACCENT(LOWER(u.username)) LIKE LOWER($1) AND
      approved = false
    ORDER BY ct.id
    OFFSET $2
    LIMIT $3`,
  `%${username}%`,
  0 + (ROWS_PER_PAGE * page),
  ROWS_PER_PAGE
  ));

  await ctx.render('admin_approve', {
    transfers,
    page,
    prevPage: page - 1,
    nextPage: page + 1,
    username,
    permissions: ctx.session.permissions,
    admin: ctx.session.username
  });
});

// GET logout
router.get(paths.backOfficeLogout, async (ctx, next) => {
  trace(`GET '${paths.backOfficeMountPoint}/${paths.backOfficeLogout}'`);

  ctx.session = null;
  await ctx.redirect(paths.backOfficeMountPoint);
});

async function denyAccess (ctx, next) {
  ctx.session.msg = `You don't have permission to go there`
  await ctx.redirect(paths.backOfficeMountPoint);
}

app.use(router.routes());

module.exports = app;

const assert = require('assert');
const Router = require('koa-router');

const router = new Router({ prefix: '/auth' });

router.post('/register', async (ctx, next) => {
  // todo: data format validation

  try {
    const result = await ctx.db.query(`SELECT username, created_at, success FROM
      register ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, NULL)
      AS (username TEXT, created_at TIMESTAMP, success BOOLEAN);`,
    [
      ctx.request.body.username,
      ctx.request.body.email,
      ctx.request.body.firstName,
      ctx.request.body.lastName,
      ctx.request.body.password,
      ctx.request.body.country,
      ctx.request.body.address,
      ctx.request.body.phoneNumber,
      ctx.request.body.currency,
      ctx.request.body.dateOfBirth
    ]);
    assert.strictEqual(typeof (result.rows[0].success), 'boolean', 'property \'success\' returned from register is not boolean');
    if (result.rows[0].success) {
      console.log(`New user created at ${result.rows[0].created_at}`);
      ctx.status = 201;
    } else {
      ctx.status = 412;
    }
  } catch (error) {
    console.error(error);
    ctx.throw();
  }
});

router.post('/login', async (ctx, next) => {
  // todo: data format validation

  try {
    const result = await ctx.db.query(`SELECT username, success FROM
      login ($1, $2)
      AS (username TEXT, success BOOLEAN);`,
    [ctx.request.body.username, ctx.request.body.password]);

    assert.strictEqual(typeof (result.rows[0].success), 'boolean', 'property \'success\' returned from login is not boolean');
    if (result.rows[0].success) {
      ctx.status = 200;
    } else {
      ctx.status = 404;
    }
  } catch (error) {
    console.error(error);
    ctx.throw();
  }
});

module.exports = router;

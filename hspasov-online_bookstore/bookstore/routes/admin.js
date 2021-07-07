const assert = require('assert');
const Router = require('koa-router');
// const send = require('koa-send');

const router = new Router({ prefix: '/admin' });

router.get('/', async (ctx, next) => {
  await ctx.render('admin-index');
  // await send(ctx, 'public/html/admin.html');
});

router.get('/users', async (ctx, next) => {
  try {
    const result = await ctx.db.query('SELECT id, username, email, first_name, last_name FROM users;');
    assert.strictEqual(typeof (result), 'object', 'Result of query is not an object.');
    assert.strictEqual(Array.isArray(result.rows), true, 'Property \'rows\' of query result is not an array.');
    if (result.rows.length > 0) {
      ctx.status = 200;
      await ctx.render('admin-users', { users: result.rows });
    } else {
      ctx.status = 404;
    }
  } catch (error) {
    console.log(error);
    ctx.throw();
  }
});

router.get('/users/create', async (ctx, next) => {
  await ctx.render('admin-users-create');
});

router.get('/users/:id', async (ctx, next) => {
  ctx.assert(ctx.params.id, 'User id not provided');
  ctx.assert(!Number.isInteger(ctx.params.id), 'Please provide a number of user id: /users/:id');
  ctx.assert(ctx.params.id >= 1, 'Please provide a positive integer for a number of user id!');
  try {
    const result = await ctx.db.query(`
    
      SELECT 
        id, username, email, first_name, last_name, country, address, phone_number, balance, currency, date_of_birth, image, created_at, updated_at
      FROM users 
      WHERE id = $1;
      
    `, [ctx.params.id]);
    await ctx.render('admin-users', { users: result.rows });
  } catch (error) {
    console.log(error);
    ctx.throw();
  }
});

router.get('/users/:id/edit', async (ctx, next) => {
  ctx.assert(ctx.params.id, 'User id not provided');
  ctx.assert(!Number.isInteger(ctx.params.id), 'Please provide a number of user id: /users/:id');
  ctx.assert(ctx.params.id >= 1, 'Please provide a positive integer for a number of user id!');
  try {
    const result = await ctx.db.query(`SELECT id, username, email, first_name, last_name, country,
    address, phone_number, balance, currency, date_of_birth, image, created_at, updated_at
    FROM users WHERE id = $1;`, [ctx.params.id]);
    if (result.rows.length > 0) {
      ctx.status = 200;
      await ctx.render('admin-users-edit', { user: result.rows[0] });
    } else {
      ctx.status = 404;
    }
  } catch (error) {
    console.log(error);
    ctx.throw();
  }
});

router.post('/users/:id/edit', async (ctx, next) => {
  const form = ctx.request.body;
  ctx.assert(form.username, 'Invalid form submission');
  ctx.assert(form.email, 'Invalid form submission');
  ctx.assert(form.firstName, 'Invalid form submission');
  ctx.assert(form.lastName, 'Invalid form submission');
  ctx.assert(form.country, 'Invalid form submission');
  ctx.assert(form.address, 'Invalid form submission');
  ctx.assert(form.phoneNumber, 'Invalid form submission');
  ctx.assert(form.currency, 'Invalid form submission');
  ctx.assert(form.dateOfBirth, 'Invalid form submission');
  ctx.assert(ctx.params.id, 'User id not provided');
  ctx.assert(!Number.isInteger(ctx.params.id), 'Please provide a number of user id: /users/:id');
  ctx.assert(ctx.params.id >= 1, 'Please provide a positive integer for a number of user id!');
  try {
    await ctx.db.query(`
      UPDATE users
      SET 
        username = $1,
        email = $2,
        first_name = $3,
        last_name = $4,
        country = $5,
        address = $6,
        phone_number = $7,
        currency = $8,
        date_of_birth = $9
      WHERE id = $10;
      `,
      [form.username, form.email, form.firstName, form.lastName, form.country, form.address, form.phoneNumber, form.currency, form.dateOfBirth, ctx.params.id]);
    ctx.status = 200;
    ctx.response.redirect(`/admin/users/${ctx.params.id}`);
  } catch (error) {
    console.log(error);
    ctx.throw();
  }
});

router.get('/items', async (ctx, next) => {
  try {
    const result = await ctx.db.query(`SELECT id, title, description,
      price, currency, created_at, updated_at, label, thumnail FROM items
      LEFT JOIN categories ON items.category_id = items.id;`);
    assert.strictEqual(typeof (result), 'object', 'Result of query is not an object.');
    assert.strictEqual(Array.isArray(result.rows), true, 'Property \'rows\' of query result is not an array.');
    if (result.rows.length > 0) {
      ctx.status = 200;
      await ctx.render('admin-items', { items: result.rows });
    } else {
      ctx.status = 404;
    }
  } catch (error) {
    console.log(error);
    ctx.throw();
  }
});

router.get('/items/create', async (ctx, next) => {
  await ctx.render('admin-items-create');
});

module.exports = router;

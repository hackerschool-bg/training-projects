const Koa = require('koa');
const logger = require('koa-logger');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const { Client } = require('pg');
const path = require('path');
const render = require('koa-ejs');

const app = new Koa();
const router = new Router();

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'ekatte',
  password: 'ekatte',
  database: 'ekatte'
});

client.connect();

app.use(logger());
app.use(bodyParser());

app.context.db = client;

render(app, {
  root: path.join(__dirname, 'view'),
  layout: false,
  viewExt: 'ejs',
  cache: false,
  debug: false
});

router.get('/', async (ctx, next) => {
  await ctx.render('index');
});

router.get('/search', async (ctx, next) => {
  const results = await ctx.db.query(`SELECT id, name FROM ekattes
    WHERE name LIKE $1::TEXT;`, [`%${ctx.query.settlement}%`]);

  const resultLinks = results.rows.map(row => {
    return {
      name: row.name,
      link: `/settlements?settlement=${row.id}`
    };
  });

  await ctx.render('result', { resultLinks });
});

router.get('/settlements', async (ctx, next) => {
  ctx.assert(ctx.query.settlement, 400, 'Error: Settlement id not provided');

  const result = await ctx.db.query(`SELECT id, kind, name, category, altitude_code, document
    FROM ekattes WHERE id = $1;`, [ctx.query.settlement]);

  ctx.assert(result.rows.length > 0, 404, 'Error: No settlement found');

  const settlement = result.rows[0];

  switch (settlement.kind) {
    case 1:
      settlement.kind = 'city';
      break;
    case 3:
      settlement.kind = 'village';
      break;
    case 7:
      settlement.kind = 'monastery';
      break;
    default:
      settlement.kind = 'unknown';
  }

  switch (settlement.altitude_code) {
    case 1:
      settlement.altitude_code = 'below 50 meters';
      break;
    case 2:
      settlement.altitude_code = '50 - 99 meters';
      break;
    case 3:
      settlement.altitude_code = '100 - 199 meters';
      break;
    case 4:
      settlement.altitude_code = '200 - 299 meters';
      break;
    case 5:
      settlement.altitude_code = '300 - 499 meters';
      break;
    case 6:
      settlement.altitude_code = '500 - 699 meters';
      break;
    case 7:
      settlement.altitude_code = '700 - 999 meters';
      break;
    case 8:
      settlement.altitude_code = '1000 or above meters';
      break;
    default:
      settlement.altitude_code = 'unknown';
  }

  await ctx.render('settlement', { settlement });
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);

console.log('Listening on 3000...');

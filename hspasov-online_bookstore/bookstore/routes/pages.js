const Router = require('koa-router');
const send = require('koa-send');

const router = new Router();

router.get('/login', async (ctx, next) => {
  await send(ctx, 'public/html/login.html');
});

router.get('/register', async (ctx, next) => {
  await send(ctx, 'public/html/register.html');
});

router.get('/', async (ctx, next) => {
  await send(ctx, 'public/html/index.html');
});

module.exports = router;

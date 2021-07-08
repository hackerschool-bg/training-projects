const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const serve = require('koa-static');
const views = require('koa-views');
const logger = require('koa-logger');
const send = require('koa-send');
const path = require('path');

const database = require('./database');

const app = new Koa();
const router = new Router();

app.use(logger());

app.use(views(path.join(__dirname, '/views'), {
  map: {
    html: 'mustache',
  },
}));

app.use(async function (ctx, next) {
  ctx.state = {
    session: this.session,
    title: 'norm-app',
  };

  await next();
});

router.get('/', serve('static'));

// TODO renderUserPage
async function renderNamePage (ctx, name) {
  if (database.exists(name)) {
    const record = database.getRecord(name);
    console.log(record);
    await ctx.render('name.html', {
      username: record.name,
      files: Object.values(record.files)
    });
  } else {
    await ctx.render('name-not-found.html', {name});
  }
}

router.get('/names', async (ctx, next) => {
  const name = ctx.query.name;

  await renderNamePage(ctx, name);
  await next();
});

router.post('/names',
  koaBody({multipart: true}),
  async (ctx, next) => {
    const {name} = ctx.request.body;

    if (!name) {
      ctx.body = 'Bad post request';
      await next();
      return;
    }

    // TODO maybe assert files.file
    database.upload(name, ctx.request.files.file);
    // TODO redirect
    ctx.redirect(`/names/${encodeURIComponent(name)}`);
    await next();
  }
);

router.get('/names/:name', async(ctx, next) => {
  const {name} = ctx.params;
  console.log(name);

  await renderNamePage(ctx, name);
  await next();
});

// TODO pass through web server instead of application
router.get('/names/:name/:file', async(ctx, next) => {
  const {name, file} = ctx.params;
  const record = database.getRecord(name);

  if (!record) {
    ctx.status = 404;
    await next();
    return;
  }

  const filePath = record.files[file].path;
  await send(ctx, filePath);
  await next();
});

app.use(router.routes())
  .use(router.allowedMethods());

app.listen(3000);

const Koa = require('koa');
const { DEFAULT_PORT } = require('./utils/consts.js');
const mount = require('koa-mount');
const api = require('./api/api.js');
const frontOffice = require('./server/front_office.js');
const backOffice = require('./server/back_office.js');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const views = require('koa-views');
const { PeerError, UserError } = require('./asserts/exceptions.js');
const session = require('koa-session');
const paths = require('./etc/config.js');
const SMTPTransporter = require('./email/email.js');
const fs = require('fs');

const app = new Koa();

app.use(serve(`${__dirname}/server/public/css`));
app.use(serve(`${__dirname}/server/public/js`));
app.use(serve(`${__dirname}/server/public/doc`));
app.use(serve(`${__dirname}/server/public/png`));

app.use(views(`${__dirname}/server/views`, {
  extension: 'hbs',
  map: { hbs: 'handlebars' }, // marks engine for extensions
  options: {
    partials: {
      adminForm: `./admin_form`, // requires ./admin_form.hbs
      adminMenu: `./admin_menu`,
      navBar: `./admin_nav_bar`,
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
      const mailOptions = {
        from: 'mailsender6000@gmail.com',
        to: 'rosen@arc-global.org',
        subject: 'Alert',
        html: `
          <p>${err}</p>
          <p>Status Code: ${err.statusCode}</p>
          <p>Time: ${new Date().toISOString()}</p>
        `
      };

      await SMTPTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        }
      });

      fs.appendFile('./src/server/logs/assert.log', `${new Date().toISOString()}:  ${err}\n`, (err) => {
        if (err) console.error(`Error while logging assert: ${err.message}`);
      });

      console.log(err);

      ctx.body = 'An error occured please clear your cookies and try again';
    }
  }
});

app.use(bodyParser());
app.use(mount(paths.APIMountPoint, api));
app.use(mount(paths.frontOfficeMountPoint, frontOffice));
app.use(mount(paths.backOfficeMountPoint, backOffice));

let port;

if (
    Number(process.env.npm_package_config_port) &&
    process.env.npm_package_config_port > 0 &&
    process.env.npm_package_config_port < 65536
  ) {
    port = process.env.npm_package_config_port;
} else {
  port = DEFAULT_PORT;
}

const server = app.listen(port, () => {
  console.log(`App Server listening on port: ${port}`);
});

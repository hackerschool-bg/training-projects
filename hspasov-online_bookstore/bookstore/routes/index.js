const combineRouters = require('koa-combine-routers');
const authentication = require('./authentication');
const admin = require('./admin');
const pages = require('./pages');

module.exports = combineRouters([
  authentication,
  pages,
  admin
]);

// var app = require('http').createServer(createServer);
var path = require('path');
var homepage = require('./home');
var verify = require('./verify');
var express = require('express');
var app = express();
var myParser = require('body-parser');
var register = require('./register');
var login = require('./login');
var redis = require('redis');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var client = redis.createClient();
var productControls = require('./product_controls');
var formidable = require('formidable');
var cart = require('./carts.js');
var schedule = require('node-schedule');
var addr = require('./addr');
var order = require('./order');

schedule.scheduleJob('0 0 * * *', function () {
  register.deleteUnverified();
  cart.deleteExpired();
});

var images = path.join(__dirname, 'images');
var publicfiles = path.join(__dirname, 'public');
app.use(session({
  secret: 'idk',
  store: new RedisStore({ host: 'localhost', port: 6379, client: client, ttl: 260 }),
  saveUninitialized: false,
  resave: false
}));
app.use(myParser.urlencoded({ extended: true }));
app.use('/images', express.static(images));
app.use('/public', express.static(publicfiles));

app.get('/register', async function (request, response) {
  if ((request.session.user === undefined && request.session.admin === undefined) || request.session.admin !== undefined) {
    response.sendFile('public/register.html', { root: __dirname });
  } else {
    response.send("<script>alert('You are already logged in');window.location.href='/'</script>");
  }
});

app.get('/newAddr', async function (request, response) {
  response.sendFile('public/newAddress.html', { root: __dirname });
});

app.get('/', function (request, response) {
  response.sendFile('public/home.html', { root: __dirname });
});

app.post('/homeProducts', async function (request, response) {
  response.send(await homepage.generateHTML());
});

app.get('/success', function (request, response) {
  response.sendFile('public/success.html', { root: __dirname });
});

app.get('/login', function (request, response) {
  response.sendFile('public/login.html', { root: __dirname });
});

app.get('/admin', function (request, response) {
  response.sendFile('public/admin_controls.html', { root: __dirname });
  // if (request.session.admin) {
  //   response.sendFile('public/admin_controls.html', { root: __dirname });
  // } else if (request.session.user) {
  //   response.redirect('/');
  // } else {
  //   response.redirect('/login');
  // }
});

app.get('/profile', function (request, response) {
  response.sendFile('public/profile.html', { root: __dirname });
});

app.get('/cart', function (request, response) {
  response.sendFile('public/cart.html', { root: __dirname });
});

app.post('/login', function (request, response) {
  var promise = login.checkLogin(request.body.uname, request.body.pass);
  promise.then(function (value) {
    if (value === 'Success') {
      request.session.user = request.body.uname;
    } else if (value === 'Admin') {
      request.session.admin = request.body.uname;
    }
    response.send(value);
    response.end(' ');
  });
});

app.post('/logout', function (request, response) {
  if (request.session.user || request.session.admin) {
    request.session.destroy();
    response.redirect('/login');
  } else {
    response.redirect('/login');
  }
});

app.post('/productControls', function (request, response) {
  var form = new formidable.IncomingForm();
  form.parse(request, async function (err, fields, files) {
    if (err) {
      console.log(err);
      response.end();
    }
    if (fields.form === 'update') {
      await productControls.update(fields, files);
    } else if (fields.form === 'add') {
      await productControls.add(fields, files);
    } else if (fields.form === 'delete') {
      await productControls.remove(fields);
    }
    response.end();
  });
});

app.post('/islogged', function (request, response) {
  response.send(request.session);
});

app.post('/removeAll', async function (request, response) {
  await cart.removeAll(request.session.user);
  response.end();
});

app.post('/getCart', async function (request, response) {
  var result = await cart.getProducts(request.session.user);
  response.send(result);
});

app.get('/order', async function (request, response) {
  if (request.session.user !== undefined) {
    response.sendFile('public/order.html', { root: __dirname });
  } else {
    response.write('<script>alert("You are not logged in");window.location.href="/login"</script>');
  }
});

app.post('/addToCart', async function (request, response) {
  try {
    await cart.addProduct(request.body.pid, request.session.user);
  } catch (err) {
    console.log(err);
    response.send('An error occured');
  }
  response.send('Product added');
});

app.post('/removeProduct', async function (request, response) {
  await cart.removeProduct(request.body.item, request.session.user, request.body.all);
  response.end();
});

app.post('/newAddr', async function (request, response) {
  response.send(await addr.saveAddr(request.body, request.session.user));
});

app.get('/paySuccess', async function (request, response) {
  order.paid(request.session.pay_id);
  request.session.pay_id = '';
  cart.removeAll(request.session.user);
  response.sendFile('public/paySuccess.html', { root: __dirname });
});

app.post('/placeOrder', async function (request, response) {
  try {
    console.log(request.body);
    if (request.body.type === '0') {
      var result = await order.place(request.session.user, request.body);
      request.session.pay_id = result.id;
      response.redirect(result.returnUrl);
    }
  } catch (err) {
    console.log(err);
    response.send('An error occured');
  }
});

app.post('/fillDropdowns', async function (request, response) {
  var addresses = await addr.getAddr(request.session.user);
  var types = await order.getPayTypes();
  var result = {};
  result.addresses = addresses;
  result.types = types;
  response.send(result);
});

app.post('/checkStock', async function (request, response) {
  response.send(await cart.checkStock(request.session.user));
});

app.post('/register', function (request, response) {
  try {
    var promise = register.checkData(request.body);
    promise.then(function (value) {
      if (value === 'All good') {
        register.saveUser(request.body.uname, request.body.pass, request.body.fname, request.body.lname, request.body.email, request.session.admin);
        response.send(value);
      } else {
        response.send(value);
      }
      response.end();
    });
  } catch (err) {
    response.send(err.message);
  } finally {
    response.end();
  }
});

app.get('/verify/:email/:hash', function (request, response) {
  try {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    var status = verify.checkHash(request.params.email, request.params.hash);
    status.then(function (value) {
      if (value === 'Ok') {
        response.write('<p align="center">Your email has been verified</p><p align="center">You will be redirected to the login page shortly</p><script>setTimeout(function(){window.location.href="/login"},5000)</script>');
      } else {
        response.write('<p align="center">' + value + '</p>');
      }
      response.end();
    });
  } catch (err) {
    response.send(err.message);
  } finally {
    response.end();
  }
});

app.listen(8080);

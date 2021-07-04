let express = require('express');
let router = express.Router();
let $ = require('jquery');
let request = require('request');
let braintree = require('braintree');
let fs = require('fs');
let bodyparser = require('body-parser');
let net = require('net');
let lp = require('node-lp');
let cmd = require('node-cmd');
let bcrypt = require('bcrypt');

let buyController = require('./controllers/buyController');
let homeController = require('./controllers/homeController');
let userController = require('./controllers/userController');
let cartController = require('./controllers/cartController');
let printController = require('./controllers/printController');
let ordersController = require('./controllers/ordersController');
let productsController = require('./controllers/productsController');
let backofficeController = require('./controllers/backofficeController');

console.log('Server up and running...');

//HOME CONTROLLER////////////////////////////////////////////////////////////////

/* GET home/categories page. */
router.get('/', homeController.getHome);
/* POST home page. */
router.post('/', homeController.postHome);
/* GET category page. */
router.get('/category/:id/:sort/:word', homeController.getCategory);
/* POST category page. */
router.post('/category/:id/:sort/:word', homeController.postCategory);
/*GET steal content */
router.get('/steal', homeController.getSteal)

//USER CONTROLLER////////////////////////////////////////////////////////////////

/* GET registration page. */
router.get('/register', userController.getRegister);
/* GET login page. */
router.get('/login', userController.getLogin);
/* GET googleauth page. */
router.get('/oauth2callback', userController.googleCallback);
/* GET details page. */
router.get('/details', userController.getDetails);
/* GET forgotten password page. */
router.get('/fp', userController.getFPass);
/* GET forgotten password page. */
router.get('/fp/:code', userController.getFPassCode);
/* GET forgotten password page. */
router.post('/fp/:code', userController.postFPassCode);
/* GET forgotten password page. */
router.post('/fp', userController.postFPass);
/* GET logout. */
router.get('/logout', userController.getLogout);
/* GET verify. */
router.get('/verify/:id', userController.getVerify);
/* POST registration page */
router.post('/register', userController.postRegister);
/* POST login page */
router.post('/login', userController.postLogin);
/* GET profile page */
router.get('/profile', userController.getProfile);
/* POST profile page. */
router.post('/profile', userController.postProfile);
/* GET chpass page */
router.get('/chpass', userController.getChpass);
/* POST chpass page.*/
router.post('/chpass', userController.postChpass);

//BACK OFFICE CONTROLLER////////////////////////////////////////////////////////////////

/* GET admin page. */
router.get('/admin', backofficeController.getAdmin);
/* POST admin page */
router.post('/admin', backofficeController.postAdmin);
/* GET check page. */
router.get('/check', backofficeController.getCheck);
/* POST check page. */
router.post('/check', backofficeController.postCheck);
/* GET check:id page. */
router.get('/check/:id', backofficeController.getCheckId);
/* POST check page. */
router.post('/check/:id', backofficeController.postCheckId);
/* GET edit page. */
router.get('/edit/:id', backofficeController.getEdit);
//get delete product
router.get('/delete/:id', backofficeController.getDelete);
/* POST add prod page. */
router.post('/add', backofficeController.postAddProd);
//get accounts page
router.get('/accs', backofficeController.getAccs);
/* POST edit page. */
router.post('/edit/:id', backofficeController.postEdit);
/* GET ALL products page. */
router.get('/all', backofficeController.getAll);

// PRODUCTS CONTROLLER////////////////////////////////////////////////////////////////

/* GET add prod page. */
router.get('/add', productsController.getAddProduct);

// ORDERS CONTROLLER////////////////////////////////////////////////////////////////

/* GET orders page. */
router.get('/orders', ordersController.getOrders);

// PRINT CONTROLLER////////////////////////////////////////////////////////////////

/* GET print format page */
router.get('/printf', printController.getPrint);
/* POST print format page. */
router.post('/printf', printController.postPrintFormat);
/* POST pprint. */
router.post('/print', printController.postPrint);

// CART CONTROLLER////////////////////////////////////////////////////////////////

/* GET cart page. */
router.get('/cart', cartController.getCart);
//get remove product from cart
router.get('/remove/cart/:id', cartController.getRemoveFromCart);
/* POST add to cart. */
router.post('/addtocart', cartController.postAddToCart);
/* POST changeQuant. */
router.post('/changeQuant', cartController.postChangeQuant);
/* POST remove from cart. */
router.post('/remove', cartController.postRemoveFromCart);
/* POST cart. */
router.post('/cart', cartController.postCart);

//BUY CONTROLLER////////////////////////////////////////////////////////////////

/* GET buy page */
router.get('/buy', buyController.getBuy);
/* POST buy page */
router.post('/buy', buyController.postBuy);

module.exports = router;


// /* GET regadm. */
// router.get('/regadm', function(req, res, next) {
//   console.log('asd');
//   let salt = u.generateId();
//   let saltedPass = salt + '123123';
//
//   bcrypt.hash(saltedPass, 5, function(err, hash) {
//       client.query("insert into admins (username, pass, salt) " +
//                                   "values(%L, %L, %L);", 'acc', hash, salt)
//           .then(res.redirect(303, '/admin'))
//           .catch(e => console.error(e.stack));
//   });
// });

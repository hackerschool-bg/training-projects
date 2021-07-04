let client = require('../../database/db');
let transporter = require('../../email/email');
let u = require('../../utils/utils');
let bcrypt = require('bcrypt');
let request = require('request');

module.exports = {
    getAdmin: function(req, res, next) {
        if (req.session.loggedIn) {
            res.redirect(303, '/');
        }

        if(req.session.logincount == undefined){
            req.session.logincount = 0;
        }

        if (req.session.logincount > 2) {
            res.render('admin', {
                data: {
                    'isLoggedIn': req.session.loggedIn,
                    'user': req.session.username,
                    'isAdmin': req.session.admin,
                    'r': true
                }
            });
        }
        res.render('admin', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'r': false
            }
        });
    },
    postAdmin: function(req, res) {
        let recaptchaResp = req.body['g-recaptcha-response'];
        let verifyURL = 'https://www.google.com/recaptcha/api/siteverify?secret=6LdF9FQUAAAAAJrUDQ7a-KxAtzKslyxhA7KZ-Bwt&response=' + recaptchaResp;

        if (req.session.logincount > 2) {
            request(verifyURL, (err, response, body) => {
                body = JSON.parse(body);
                if (body.success !== undefined && !body.success) { //failed captcha
                    return failAdminLogin(req, res, 3);
                } else {
                    return checkAdminInfo(res, req);
                }
            });
        } else {
            return checkAdminInfo(res, req);
        }
    },
    getCheck: async function(req, res, next) {
      if (!req.session.admin) {
        res.redirect(303, '/');
      }

      //check?state=0&sort=3&from=05-05-2018&to=04-06-2018&word=pes

      let sortIndex = Number(req.query.sort);
      let state = Number(req.query.state);
      let gb = Number(req.query.groupby);
      let fromDate = req.query.from;
      let toDate = req.query.to;
      let word = req.query.word;

      let fromTokens = fromDate.split('-');
      let toTokens = toDate.split('-');

      let from = fromTokens[2] + '-' + fromTokens[1] + '-' + fromTokens[0];
      let to = toTokens[2] + '-' + toTokens[1] + '-' + toTokens[0];

      let sortString = await getSortStringById(sortIndex);

      let stateString;

      if(state==4){
        stateString = "";
      }else{
        stateString = "and state = " + state + " ";
      }

      if(gb == 3){
        let checkQuery = getCheckQuery(
        "where lower(a.first_name) like concat('%', $1::text, '%') "+
        "and date between $2 and $3 "+
        stateString,
        "order by "+sortString);

        let data = await client.query(checkQuery, [word.toLowerCase(), from, to]);
        let purchases = data.rows;

        await purchases.forEach((row)=>{
            let tokens = String(row.date).substr(0,15).split(" ");
            row.date = tokens[2] + ' ' + tokens[1] + ' ' + tokens[3];
            row.tot = u.addTrailingZeros(row.tot);
        });


        res.render('check', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'purchases': purchases,
                'state': state,
                'sort': sortIndex,
                'from': fromDate,
                'to': toDate,
                'word': word,
                'groupby': gb
            }
        });
      }else{
        let gbQuery = getGbStringById(gb, sortIndex);

        let totals = await client.query(gbQuery, [word.toLowerCase(), from, to]);
        let totalValues = totals.rows;
        console.log(totalValues);

        if(gb === 0){
          await totalValues.forEach((row)=>{
            let tokens = String(row.date).substr(0,15).split(" ");
            row.date = tokens[2] + ' ' + tokens[1] + ' ' + tokens[3];
            row.tot = u.addTrailingZeros(row.tot);
          });
        }else{
          await totalValues.forEach((row)=>{
            row.date = row.date
            row.tot = u.addTrailingZeros(row.tot);
          });
        }

        res.render('check', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'purchases': totalValues,
                'state': state,
                'sort': sortIndex,
                'from': fromDate,
                'to': toDate,
                'word': word,
                'groupby': gb
            }
        });
      }
    },
    postCheck: async function(req, res, next) {
        if (!req.session.admin) {
            res.redirect(303, '/');
        }
        let state = req.body.state;
        let gb = req.body.groupby;
        let sort = req.query.sort;

        let fDay = req.body.fromDay;
        let fMonth = req.body.fromMonth;
        let fYear = req.body.fromYear;

        let tDay = req.body.toDay;
        let tMonth = req.body.toMonth;
        let tYear = req.body.toYear;

        let word = req.body.word;

        let fromNormalFormat = fDay + '-' + fMonth + '-' + fYear;
        let toNormalFormat = tDay + '-' + tMonth + '-' + tYear;

        res.redirect(
          303, '/check?state='+state+'&groupby=' + gb + '&sort='+sort+'&from='+fromNormalFormat+'&to='+toNormalFormat+'&word=' + word);
    },
    getCheckId: async function(req, res, next) {
      if (!req.session.admin) {
          res.redirect(303, '/');
      }
      let purchId = req.params.id;
      let currentCart = [];

      let data = await client.query(
        'select pi.prodname as name, sum(pi.quantity) as quantity, '+
        'pi.prodprice as price, pur.userid '+
        'from purchase_items as pi '+
        'join purchases as pur '+
        'on pi.purchaseId = pur.id '+
        'where pur.id = $1 '+
        'group by pi.prodname, pi.prodprice, pur.userid '+
        'order by pi.prodname asc', [purchId]);
      let totalPrice = 0;
      let count = 1;
      await data.rows.forEach((row) => {
          totalPrice += (Number(row.price) * Number(row.quantity));
          row.number = count++;
          row.price = u.addTrailingZeros(row.price);
          currentCart.push(row);
      });
      totalPrice = u.addTrailingZeros(totalPrice);
      res.render('purchases', {
          data: {
              'isLoggedIn': req.session.loggedIn,
              'user': req.session.username,
              'isAdmin': req.session.admin,
              'cart': currentCart,
              'total': totalPrice
          }
      });
    },
    postCheckId: async function(req, res, next) {
        if (!req.session.admin) {
            res.redirect(303, '/');
        }
        let purchID = req.params.id;
        let newState = req.body.state;

        await client.query(
          "update purchases set state = $1 where id = $2", [newState, purchID]);
        res.redirect(303, '/check?state=4&sort=1&from=01-01-1999&to=01-01-2050&word=');
    },
    postAddProd: async function(req, res) {
        let name = req.body.name;
        let price = req.body.price;
        let quant = req.body.quant;
        let descr = req.body.descr;
        let img = req.body.img;

        await client.query(
          "insert into products values($1, $2, $3, $4, $5);", [name, price, quant, descr, img]);
        let product = await client.query(
          "select id from products where name = $1 and img = $2", [name, img]);
        let pid = product.rows[0].id;
        for (let i in req.body) {
          if (u.isNumber(i)) {
              client.query(
                "insert into products_categories values($1, $2)", [pid, i]);
          }
        }
          res.redirect(303, '/');
    },
    getEdit: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let productId = req.params.id;
        let data = await client.query(
          "select p.name, p.price, p.quantity, p.description, p.img "+
          "from products as p "+
          "where p.id = $1", [productId]);
        let ctg = [];
        let row = data.rows[0];
        let name = row.name;
        let price = row.price;
        let quantity = row.quantity;
        let descr = row.description;
        let img = row.img;
        let cats = await client.query("select * from categories");
        await cats.rows.forEach((row) => ctg.push(row.name));
        res.render('edit', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'name': name,
                'price': price,
                'quantity': quantity,
                'descr': descr,
                'ctg': ctg,
                'img': img
            }
        });
    },
    getDelete: async function(req, res) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let id = req.params.id;
        await client.query("delete from products_categories where product = $1", [id]);
        await client.query("delete from products where id = $1", [id]);
        res.redirect(303, '/');
    },
    getAccs: async function(req, res) {
      if (!req.session.admin || !u.contains(req.session.roles, 1)) {
          res.redirect(303, '/');
      }

      let data = await client.query("select * from accounts order by id");
      let users = data.rows;

      res.render('accs', {
          data: {
              'isLoggedIn': req.session.loggedIn,
              'user': req.session.username,
              'isAdmin': req.session.admin,
              'users': users
          }
      });
    },
    postEdit: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let productId = req.params.id;
        let name = req.body.name;
        let price = req.body.price;
        let quant = req.body.quant;
        let descr = req.body.descr;
        let img = req.body.img;

        await client.query(
          "delete from products_categories where product = $1", [productId]);
        for (let i in req.body) {
            if (u.isNumber(i)) {
                client.query(
                  "insert into products_categories values($1, $2)", [productId, i])
                    .catch(e => console.error(e.stack))
            }
        }

        await client.query(
          "update products set name = $1, price = $2, quantity = $3, "+
          "description = $4, img = $5 where id = $6;",
          [name, price, quant, descr, img, productId]);
        await client.query(
          "update cart_items set modified = true where prodid = $1", [productId]);

        let usersWithProductInCart = await client.query(
          "select acc.email "+
          "from accounts as acc "+
          "join shopping_carts as sc "+
          "on acc.id = sc.userid "+
          "join cart_items as ci "+
          "on ci.cartid = sc.id "+
          "where ci.modified = true "+
          "group by acc.email;");
        await usersWithProductInCart.rows.forEach(async (row)=>{
          // nodemailer.sendmail;
          const mailOptions = {
              from: 'mailsender6000@gmail.com', // sender address
              to: row.email, // list of receivers
              subject: 'Product Changed', // Subject line
              html: '<p>A product in your cart has been changed</p>' // plain text body
          };
          await transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                  return console.log(error);
              }
              console.log('Message sent: ' + info.response);
          });
        });
        res.redirect(303, '/');
    },
    getAll: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let products = [];
        let catId = req.params.id;
        let prods = await client.query(
          "select * from products as p order by name");
        let number = 0;
        prods.rows.forEach((prod) => {
          prod.number = ++number;
          prod.price = u.addTrailingZeros(prod.price);
          products.push(prod);
        });
        res.render('index', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'prods': products
            }
        });
    }
}

async function checkAdminInfo(res, req) {
    let username = req.body.username;
    let pass = req.body.password;
    let foundUser = false;
    let accounts = await client.query(
      "select a.username, a.pass, a.salt, ar.role from admins as a join admins_roles as ar on a.id = ar.admin where username = $1", [username]);
    let account = accounts.rows[0];
    req.session.roles = [];
    await accounts.rows.forEach((row)=>{
      req.session.roles.push(row.role);
    });
    console.log(req.session.roles);
    if(accounts.rows.length != 0){
      bcrypt.compare(account.salt + pass, account.pass,
        function(err, bcryptResp) {
          if (bcryptResp == true) {
              req.session.loggedIn = true;
              req.session.admin = true;
              req.session.username = account.username;
              req.session.logincount = 0;
              res.redirect(303, '/');
          } else {
              return failAdminLogin(req, res, 1);
          }
      });
    }else{
      return failAdminLogin(req, res, 2);
    }
}

function failAdminLogin(req, res, code) {
    let captchaBool = false;
    req.session.logincount++;
    if (req.session.logincount > 2) {
        captchaBool = true;
    }
    return res.render('admin', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'r': captchaBool,
            'f': code
        }
    });
}

function getSortStringById(sortIndex){
  switch(sortIndex){
    case 1:
      return 'p.date asc ';
    case 2:
      return 'a.first_name asc ';
    case 3:
      return 'a.address asc ';
    case 4:
      return 'st.name asc ';
    case 5:
      return 'tot asc ';
    case 6:
      return 'p.date desc ';
    case 7:
      return 'a.first_name desc ';
    case 8:
      return 'a.address desc ';
    case 9:
      return 'st.name desc ';
    case 10:
      return 'tot desc ';
  }
}

function getTotalSortStringById(sortIndex){
  switch(sortIndex){
    case 1:
      return 'p.date asc ';
    case 5:
      return 'tot asc ';
    case 6:
      return 'p.date desc ';
    case 10:
      return 'tot desc ';
    default:
      return 'p.date asc ';
  }
}

function getGbStringById(gb, sortIndex){
  let sortString = getTotalSortStringById(sortIndex);
  switch(gb){
    case 0:
      return "select sum(pi.prodprice * pi.quantity) as tot, p.date from accounts as a join purchases as p on a.id = p.userid join states as st on st.id = p.state join purchase_items as pi on pi.purchaseid = p.id where lower(a.first_name) like concat('%', $1::text, '%') and date between $2 and $3 group by p.date order by " + sortString;
    case 1:
      if(sortIndex != 5 && sortIndex != 10){
        sortString = 'extract(month from p.date) asc';
      }
      if(sortIndex == 6){
        sortString = 'extract(month from p.date) desc'
      }
      return "select sum(pi.prodprice * pi.quantity) as tot, concat(0, extract(month from p.date), '-', extract(year from p.date)) as date from accounts as a join purchases as p on a.id = p.userid join states as st on st.id = p.state join purchase_items as pi on pi.purchaseid = p.id where lower(a.first_name) like concat('%', $1::text, '%') and date between $2 and $3  group by extract(month from p.date), extract(year from p.date) order by " + sortString;
    case 2:
      if(sortIndex != 5 && sortIndex != 10){
        sortString = 'extract(year from p.date) asc';
      }
      if(sortIndex == 6){
        sortString = 'extract(year from p.date) desc'
      }
      console.log(sortString);
      return "select sum(pi.prodprice * pi.quantity) as tot, extract(year from p.date) as date from accounts as a join purchases as p on a.id = p.userid join states as st on st.id = p.state join purchase_items as pi on pi.purchaseid = p.id where lower(a.first_name) like concat('%', $1::text, '%') and date between $2 and $3 group by extract(year from p.date) order by " + sortString;
  }
}

function getCheckQuery(condition, order){
  return "select p.id, a.first_name, a.last_name, p.date, "+
  "st.name as state, p.date, sum(pi.prodprice * pi.quantity) as tot, a.address "+
  "from accounts as a join purchases as p on a.id = p.userid "+
  "join states as st on st.id = p.state "+
  "join purchase_items as pi on pi.purchaseid = p.id "+
  condition+
  "group by a.first_name, a.last_name, st.name, p.date, p.id, a.address "+
  order;
}

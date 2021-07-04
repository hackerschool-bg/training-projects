let client = require('../../database/db');
let u = require('../../utils/utils');
let bcrypt = require('bcrypt');
let Recaptcha = require('express-recaptcha').Recaptcha;
let request = require('request');
let transporter = require('../../email/email');

let { google } = require('googleapis');
let OAuth2 = google.auth.OAuth2;
let people = google.people('v1');

const ClientId = "614520466378-npmfmap2vlkp23r1t4smiejsk10akdof.apps.googleusercontent.com";
const ClientSecret = "pgDm52AdABjZGpWsK6EDR0E7";
const RedirectionUrl = "http://127.0.0.1:3000/oauth2callback";

module.exports = {
    getRegister: async function(req, res, next) {
      let url = getAuthUrl();
      let data = await client.query('select * from categories');
      let categories = data.rows;

      if (req.session.loggedIn) {
          res.redirect(303, '/');
      }
      res.render('registration', {
          data: {
              'isLoggedIn': req.session.loggedIn,
              'user': req.session.username,
              'isAdmin': req.session.admin,
              'cats': categories,
              'info': {email: "", fName: "",
                lName: "", phone: "", address: "",
                pass: "", cpass: "", cc: ""},
              'url': url
          }
      });
    },
    getLogin: async function(req, res, next) {
        if (req.session.loggedIn) {
            res.redirect(303, '/');
        }

        if(req.session.logincount == undefined){
            req.session.logincount = 0;
        }

        if (req.session.logincount > 2) {
            res.render('login', {
                data: {
                    'isLoggedIn': req.session.loggedIn,
                    'user': req.session.username,
                    'isAdmin': req.session.admin,
                    'r': true
                }
            });
        }

        res.render('login', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'r': false
            }
        });
    },
    googleCallback: function(req, res, next){
      let oauth2Client = getOAuthClient();
      let session = req.session;
      let code = req.query.code; // the query param code
      oauth2Client.getToken(code, function(err, tokens) {
       // Now tokens contains an access_token and an optional refresh_token. Save them.
        if(!err) {
          oauth2Client.setCredentials(tokens);
          //saving the token to current session
          session["tokens"]=tokens;
          res.redirect(303, '/details');
        }else{
          res.redirect(303, '/');
        }
      });
    },
    getDetails: function(req,res,next){
      let url = getAuthUrl();
      let oauth2Client = getOAuthClient();
      oauth2Client.setCredentials(req.session["tokens"]);
      request({
        url: 'https://www.googleapis.com/oauth2/v1/userinfo',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ` + req.session["tokens"].access_token,
          'Accept': 'application/json'
        }
      },
      async function(err, response, user) {
        let userObj = JSON.parse(user);
        let email = userObj.email;
        let fName = userObj.given_name;
        let lName = userObj.family_name;
        let wholeNumber = "";
        let address = "";
        //////////////////////
        let curPass = u.generateId();
        let salt = u.generateId();
        let saltedPass = salt + curPass;

        let accs = await client.query(
          "select * from accounts where lower(email) = $1", [email.toLowerCase()]);

        if (accs.rows.length != 0) {
          res.redirect(303, '/?fail=1');
        }

        await bcrypt.hash(saltedPass, 5, async function(err, hash) {
            await client.query(
                "insert into accounts (email, first_name, last_name, "+
                "phone, address, pass, salt, role, active, suspended) "+
                "values($1, $2, $3, $4, $5, $6, $7, '1', 'true', 'false');",
                [email, fName, lName, wholeNumber, address, hash, salt])
            .then(async ()=>{
              let currentAcc = await client.query(
                "select id from accounts where email=$1;", [email]); //??????
              let userid = currentAcc.rows[0].id;
              await client.query(
                "insert into shopping_carts (userid) values($1)", [userid]);
              // nodemailer.sendmail;
              const mailOptions = {
                  from: 'mailsender6000@gmail.com', // sender address
                  to: email, // list of receivers
                  subject: 'Account Password', // Subject line
                  html: '<p>Hello ' + fName + ',\n This is your current password:'+ curPass +' please change it as soon as possible for security reasons</p>' // plain text body
              };
              await transporter.sendMail(mailOptions, function(error, info) {
                  if (error) {
                      return console.log(error);
                  }
                  console.log('Message sent: ' + info.response);
              });
              req.session.userId = userid;
              req.session.loggedIn = true;
              req.session.admin = false;
              req.session.username = fName;
              req.session.logincount = 0;
              req.session.itemCount = 0;
              res.redirect(303, '/?reg=2');
            });
        });
      });
    },
    getLogout: function(req, res, next) {
        req.session.loggedIn = false;
        req.session.admin = false;
        req.session.username = 'Guest';
        res.redirect(303, '/');
    },
    getVerify: async function(req, res, next) {
        //if id exists active = true, delete from email_codes
        let verificationId = req.params.id;
        let rows;
        let id;
        let userid;
        let data = await client.query(
          'select * from email_codes as ec where ec.code = $1 order by id', [verificationId]);
        if (data.rows.length !== 0) {
            row = data.rows[0];
            id = row.id;
            userid = row.account;
        }
        await client.query('update accounts set active = true where id = $1', [userid]);
        await client.query('delete from email_codes where id = $1', [id]);
        res.redirect(303, '/login');
    },
    postRegister: async function(req, res) {
      let recaptchaResp = req.body['g-recaptcha-response'];
      let email = req.body.email;
      let fName = req.body.fname;
      let lName = req.body.lname;
      let phone = req.body.phone;
      let address = req.body.address;
      let pass = req.body.password;
      let cpass = req.body.cpassword;
      let cc = req.body.countryCode;
      let savedInfo = {
        email: email, fName: fName,
        lName: lName, phone: phone, address: address,
        pass: pass, cpass: cpass, cc: cc};
      let link;
      let stop = false;
      let wholeNumber = parseInt(phone.replace(/[^0-9]/g,''),10); // parse int removes leading zeros, replace makes sure its only numbers

      let verifyURL = 'https://www.google.com/recaptcha/api/siteverify?secret=6LdF9FQUAAAAAJrUDQ7a-KxAtzKslyxhA7KZ-Bwt&response=' + recaptchaResp;

      await request(verifyURL, async (err, response, body) => {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) { //failed captcha
            stop = true;
            await failRegister(req, res, 3, savedInfo);
        }else{ //passed captcha
            let accs = await client.query(
              "select * from accounts where lower(email) = $1", [email.toLowerCase()]);

            if (accs.rows.length != 0) {
              stop = true;
              await failRegister(req, res, 6, savedInfo);
            }

            if (!stop) {
              let salt = u.generateId();
              let saltedPass = salt + pass;
              if (await !u.validateEmail(email)) {
                  stop=true;
                  await failRegister(req, res, 5, savedInfo);
              }
              if (await !u.validatePass(pass)) {
                  stop=true;
                  await failRegister(req, res, 1, savedInfo);
              }
              if (pass !== cpass) {
                  stop=true;
                  await failRegister(req, res, 4, savedInfo);
              }
              if (await !u.validateName(fName) || await !u.validateName(lName)) {
                  stop=true;
                  await failRegister(req, res, 2, savedInfo);
              }
              if(!stop){
                  await bcrypt.hash(saltedPass, 5, async function(err, hash) {
                      await client.query(
                          "insert into accounts (email, first_name, last_name, "+
                          "phone, address, pass, salt, role, active, suspended) "+
                          "values($1, $2, $3, $4, $5, $6, $7, '1', 'false', 'false');",
                          [email, fName, lName, wholeNumber, address, hash, salt])
                      .then(async ()=>{
                        let currentAcc = await client.query(
                          "select id from accounts where email=$1;", [email]); //??????
                        let userid = currentAcc.rows[0].id;
                        await client.query(
                          "insert into shopping_carts (userid) values($1)", [userid]);
                        let code = u.generateId();
                        await client.query(
                          "insert into email_codes (account, code) values($1, $2)", [userid, code]);
                        let link = 'http://127.0.0.1:3000/verify/' + code;
                        // nodemailer.sendmail;
                        const mailOptions = {
                            from: 'mailsender6000@gmail.com', // sender address
                            to: email, // list of receivers
                            subject: 'Account Verification at Localhost:3k', // Subject line
                            html: '<p>Hello ' + fName + ',\n to verify your account click the following link: ' + link + '</p>' // plain text body
                        };
                        await transporter.sendMail(mailOptions, function(error, info) {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message sent: ' + info.response);
                        });
                        res.redirect(303, '/?reg=1');
                      });
                  });
              }
            }
          }
        });
    },
    postLogin: function(req, res) {
      let recaptchaResp = req.body['g-recaptcha-response'];
      let verifyURL = 'https://www.google.com/recaptcha/api/siteverify?secret=6LdF9FQUAAAAAJrUDQ7a-KxAtzKslyxhA7KZ-Bwt&response=' + recaptchaResp;

      if (req.session.logincount > 2) {
          request(verifyURL, (err, response, body) => {
              body = JSON.parse(body);
              if (body.success !== undefined && !body.success) { //failed captcha
                  return failLogin(req, res, 3);
              } else {
                  return checkLoginInfo(res, req);
              }
          });
      } else {
          return checkLoginInfo(res, req);
      }
    },
    getProfile: async function(req, res, next) {
        if (req.session.admin || !req.session.loggedIn) {
            res.redirect(303, '/');
        }
        let categories = [];
        let profData = [];
        let data = await client.query(
          'select a.first_name as fn, a.last_name as ln, '+
          'a.phone as ph, a.address '+
          'from accounts as a '+
          'where a.id = $1::integer', [req.session.userId]);
        let cats = await client.query('select * from categories');
        await cats.rows.forEach((cat)=> categories.push(cat));
        await data.rows.forEach((row) => profData.push(row));
        res.render('profile', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'p': profData,
                'cats': categories
            }
        });
    },
    postProfile: async function(req, res, next) {
        if (req.session.admin || !req.session.loggedIn) {
            res.redirect(303, '/');
        }
        let fName = req.body.fname;
        let lName = req.body.lname;
        let phone = req.body.phone;
        let address = req.body.address;

        if(u.validateName(fName) && u.validateName(lName)){
          await client.query(
            "update accounts set first_name = $1::text, last_name = $2::text, "+
            "address = $3::text, phone = $4::text where id = $5::integer",
             [fName, lName, address, phone, req.session.userId]);
          req.session.username = fName;
          res.redirect(303, '/?pi=1'); //password info
        }else{
          let profData = [];
          let data = await client.query(
            'select a.first_name as fn, a.last_name as ln, '+
            'a.phone as ph, a.address '+
            'from accounts as a where a.id = $1::integer', [req.session.userId]);
          let cats = await client.query('select * from categories');
          let categores = cats.rows;
          await data.rows.forEach((row) => profData.push(row));
          res.render('profile', {
              data: {
                  'isLoggedIn': req.session.loggedIn,
                  'user': req.session.username,
                  'isAdmin': req.session.admin,
                  'p': profData,
                  'f': 1,
                  'cats': categores
              }
          });
        }
    },
    getChpass: async function(req, res, next) {
        if (req.session.admin || !req.session.loggedIn) {
            res.redirect(303, '/');
        }
        let cats = await client.query('select * from categories');
        let categories = cats.rows;
        res.render('chpass', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'cats': categories
            }
        });
    },
    postChpass: async function(req, res, next) {
      if (req.session.admin || !req.session.loggedIn) {
          res.redirect(303, '/');
      }
      let pass = req.body.pass;
      let newPass = req.body.newPass;
      let repeatPass = req.body.repNewPass;
      let found = false;

      let accountData = await client.query(
        "select * from accounts where id = $1::integer", [req.session.userId]);
      if (accountData.rows.length != 0) {
        let account = accountData.rows[0];
        await bcrypt.compare(account.salt + pass, account.pass, async function(err, bcryptResp) {
          if(!bcryptResp){
            await failChangePass(req, res, 1) //f password
          }
          if(u.validatePass(!newPass)){
            await failChangePass(req, res, 2); //f validate
          }
          if(newPass !== repeatPass){
            await failChangePass(req, res, 3); //f repeat
          }
          await bcrypt.hash(account.salt + newPass, 5, async function(err, hash) {
            await client.query(
              "update accounts set pass = $1::text where id = $2::integer", [hash, req.session.userId]);
          });
          res.redirect(303, '/?pc=1');
        });
      }
    },
    getFPass: async function(req, res, next){
      if (req.session.loggedIn) {
          res.redirect(303, '/');
      }

      if(req.session.logincount == undefined){
          req.session.logincount = 0;
      }

      if (req.session.logincount > 2) {
          res.render('fp', {
              data: {
                  'isLoggedIn': req.session.loggedIn,
                  'user': req.session.username,
                  'isAdmin': req.session.admin,
                  'r': true
              }
          });
      }

      res.render('fp', {
          data: {
              'isLoggedIn': req.session.loggedIn,
              'user': req.session.username,
              'isAdmin': req.session.admin,
              'r': false
          }
      });
    },
    getFPassCode: async function(req, res, next){
      //if id exists active = true, delete from email_codes
      let verificationId = req.params.code;
      let rows;
      let id;
      let userid;
      let data = await client.query(
        'select * from fp_codes as fpc where fpc.code = $1', [verificationId]);
      if (data.rows.length !== 0) {
          row = data.rows[0];
          id = row.id;
          userid = row.account;
          console.log('match');
          // await client.query('update accounts set active = true where id = $1', [userid]);
          res.render('newpass', {
              data: {
                  'isLoggedIn': req.session.loggedIn,
                  'user': req.session.username,
                  'isAdmin': req.session.admin,
                  'r': false
              }
          });
      }
      res.redirect(303, '/');
    },
    postFPass: async function(req, res, next) {
      if (req.session.loggedIn) {
          res.redirect(303, '/');
      }

      let email = req.body.email;

      let accountData = await client.query(
        "select * from accounts where email = $1", [email]);
      if (accountData.rows.length != 0) {
        let account = accountData.rows[0];
        let code = u.generateId();
        await client.query('insert into fp_codes (account, code) values($1, $2)', [account.id, code]);
        let link = 'http://127.0.0.1:3000/fp/' + code;
        const mailOptions = {
            from: 'mailsender6000@gmail.com', // sender address
            to: email, // list of receivers
            subject: 'Office Shop Change Password Code', // Subject line
            html: '<p>Hello ' + account.first_name + ',\n to change your password click the following link: ' + link + '</p>' // plain text body
        };
        await transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
        res.redirect(303, '/?fpe=1');
      }else{
        failForgottenEmail(req, res, 1);
      }
    },
    postFPassCode: async function(req, res, next) {
      if (req.session.loggedIn) {
          res.redirect(303, '/');
      }

      let stop = false;
      let code = req.params.code;
      let newPass = req.body.pass;
      let repeatPass = req.body.rpass;

      let data = await client.query(
        "select * from fp_codes as fpc join accounts as acc on acc.id = fpc.account where fpc.code = $1", [code]);
      console.log(data.rows);
      let accId = data.rows[0].account;
      if(!u.validatePass(newPass)){
        stop = true;
        await failNewPass(req, res, 1); //f validate
      }
      if(newPass !== repeatPass){
        stop = true;
        await failNewPass(req, res, 2); //f repeat
      }
      if(!stop){
        await bcrypt.hash(data.rows[0].salt + newPass, 5, async function(err, hash) {
          await client.query(
            "update accounts set pass = $1::text where id = $2::integer", [hash, accId]);

            await client.query('delete from fp_codes where code = $1', [code]);
          });
        res.redirect(303, '/?pc=1');
      }else{
        res.redirect(303, '/');
      }
    }
}

async function failForgottenEmail(req, res, code){
    return res.render('fp', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'f': code
        }
    });
}

async function failChangePass(req, res, code){
    return res.render('chpass', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'f': code
        }
    });
}

async function failNewPass(req, res, code){
    return res.render('newpass', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'f': code
        }
    });
}

async function failRegister(req, res, code, info) {
    return res.render('registration', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'f': code,
            'info': info
        }
    });
}


async function failLogin(req, res, code) {
    let cats = await client.query("select * from categories");
    let categories = cats.rows;
    let captchaBool = false;
    req.session.logincount++;
    if (req.session.logincount > 2) {
        captchaBool = true;
    }
    return res.render('login', {
        data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'r': captchaBool,
            'f': code,
            'cats': categories
        }
    });
}

async function checkLoginInfo(res, req) {
    let email = req.body.email;
    let pass = req.body.password;
    let foundUser = false;
    let accountData = await client.query(
      "select * from accounts where email = $1", [email]);
    let totalItemsInCart = await client.query(
      "select sum(quantity) as q from cart_items as ci "+
      "join shopping_carts as sc on sc.id = ci.cartid "+
      "join accounts as acc on acc.id = sc.userid where acc.email = $1", [email]);
    let itemNum = totalItemsInCart.rows[0].q;
    let account = accountData.rows[0];
    if (accountData.rows.length != 0) {
        foundUser = true;
        await bcrypt.compare(account.salt + pass, account.pass, function(err, bcryptResp) {
            if (bcryptResp == true && account.active) {
                req.session.userId = account.id;
                req.session.loggedIn = true;
                req.session.admin = false;
                req.session.username = account.first_name;
                req.session.logincount = 0;
                req.session.itemCount = itemNum;
                res.redirect(303, '/');
            } else {
                return failLogin(req, res, 1);
            }
        });
    }
    if (!foundUser) {
        return failLogin(req, res, 2);
    }
}

function getOAuthClient () {
    return new OAuth2(ClientId ,  ClientSecret, RedirectionUrl);
}

function getAuthUrl () {
    var oauth2Client = getOAuthClient();
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });

    return url;
}

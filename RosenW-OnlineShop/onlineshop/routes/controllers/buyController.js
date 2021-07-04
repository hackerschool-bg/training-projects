let client = require('../../database/db');
let u = require('../../utils/utils');
let request = require('request');
let braintree = require('braintree');


//credit card payment keys
let merchId = '9mjmz4gm33rrmbd2';
let publicKey = 'yy9fyqg8m8yqdrhs';
let privateKey = '955e3451756ce5f6ab95eb47ce159245';

let gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: merchId,
    publicKey: publicKey,
    privateKey: privateKey
});

gateway.config.timeout = 10000;

//set up merchant account

merchantAccountParams = {
    individual: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@14ladders.com",
        phone: "5553334444",
        dateOfBirth: "1981-11-19",
        ssn: "456-45-4567",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    business: {
        legalName: "Jane's Ladders",
        dbaName: "Jane's Ladders",
        taxId: "98-7654321",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    funding: {
        descriptor: "Blue Ladders",
        destination: braintree.MerchantAccount.FundingDestination.Bank,
        email: "mailsender6000@gmail.com",
        mobilePhone: "5555555555",
        accountNumber: "1123581321",
        routingNumber: "071101307"
    },
    tosAccepted: true,
    masterMerchantAccountId: "14ladders_marketplace",
    id: "blue_ladders_store"
};

gateway.merchantAccount.create(merchantAccountParams, function(err, result) {});


module.exports = {
    getBuy: function(req, res) {
        if (req.session.admin || !req.session.loggedIn) {
            res.redirect('/');
        }
        let wd = req.query.wd;
        if(wd==1){
          wd = true;
        }
        gateway.clientToken.generate({}, function(err, response) {
            let clientToken = response.clientToken
            res.render('buy', {
                data: {
                    'isLoggedIn': req.session.loggedIn,
                    'user': req.session.username,
                    'isAdmin': req.session.admin,
                    'wd': wd,
                    'ct': clientToken
                }
            });
        });
    },
    postBuy: async function(req, res, next) {
        let pass = true;
        //get nonce
        let nonce = req.body.nonce;
        //get user prods
        let data = await client.query(
          "select pr.id, pr.price, pr.name, sum(ci.quantity) as quantity, pr.quantity as max "+
          "from cart_items as ci join products as pr on ci.prodid = pr.id "+
          "join shopping_carts as sc on ci.cartid = sc.id "+
          "where sc.userid = $1 "+
          "group by pr.id, max;", [req.session.userId])
        //check if cart empty todo
        if (data.rows.length === 0) {
            pass = false;
        }
        await data.rows.forEach((row) => {
            if (Number(row.quantity) > Number(row.max)) {
                pass = false;
            }
        });
        if (pass) {
          //make test credit card transaction
          gateway.transaction.sale({
              amount: "10.00",
              paymentMethodNonce: nonce,
              options: {
                  submitForSettlement: true
              }
          },
          async function(err, result) {
            pass = result.success;
            if (result.success) {
                await data.rows.forEach(async (row) => {
                    //row.max = row.max - row.quant
                    let newQuantity = row.max - row.quantity;
                    await client.query(
                      "update products set quantity = $1 where id = $2", [newQuantity, row.id]);
                });

                //make a purchase
                let today = new Date();
                let dd = today.getDate();
                let mm = today.getMonth()+1; //January is 0!
                let yyyy = today.getFullYear();

                if(dd<10) {
                    dd="0"+dd
                }

                if(mm<10) {
                    mm="0"+mm
                }

                today = yyyy+mm+dd + " " +today.getHours() + ":" + today.getMinutes()+":" + today.getSeconds();
                await client.query(
                  "insert into purchases (userid, state, date) "+
                  "values($1, 0, $2)", [req.session.userId, today]);
                let curPurchase = await client.query(
                  "select max(id) as id from purchases where userid = $1", [req.session.userId]);
                let curPurchid = curPurchase.rows[0].id;
                await data.rows.forEach(async (row) => {
                    //add products to purchase
                    await client.query(
                      "insert into purchase_items (purchaseid, quantity, prodname, prodprice) "+
                      "values($1, $2, $3, $4)", [curPurchid, row.quantity, row.name, row.price]);
                });

                //cart clean up
                await client.query(
                  "delete from cart_items as ci using shopping_carts as sc "+
                  "where ci.cartid = sc.id and sc.userid = $1", [req.session.userId]);

                req.session.itemCount = 0;
                res.send(true);
                next();
            } else {
              res.send(false);
            }
          });
        }else{
          res.send(false);
        }
    }
}

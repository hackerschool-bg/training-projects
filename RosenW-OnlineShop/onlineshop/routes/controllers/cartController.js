let client = require('../../database/db');
let u = require('../../utils/utils');

module.exports = {
    getCart: async function(req, res, next) {
        if (!req.session.loggedIn || req.session.admin) {
            res.redirect(303, '/');
        }
        let currentCart = [];

        let data = await client.query(
          'select pr.description, pr.img, pr.name, sum(ci.quantity) as quantity'+
          ', pr.price, pr.id, ci.id as itemsid, ci.modified '+
          'from cart_items as ci '+
          'join shopping_carts as sc '+
          'on ci.cartId = sc.id '+
          'join accounts as a on a.id = sc.userId '+
          'join products as pr on pr.id = ci.prodId '+
          'where a.id = $1 '+
          'group by pr.name, pr.price, pr.id, ci.modified, ci.id, pr.img, pr.description '+
          'order by pr.name asc', [req.session.userId]);
        let totalPrice = 0;
        let count = 1;
        await data.rows.forEach((row) => {
            totalPrice += (Number(row.price) * Number(row.quantity));
            row.number = count++;
            row.price = u.addTrailingZeros(row.price);
            currentCart.push(row);
        });
        totalPrice = u.addTrailingZeros(totalPrice);
        res.render('cart', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'cart': currentCart,
                'total': totalPrice
            }
        });
    },
    getRemoveFromCart: async function(req, res) {
        if (!req.session.loggedIn) {
            res.redirect(303, '/');
        }
        let id = req.params.id;
        await client.query(
          "delete from cart_items as ci using shopping_carts as sc "+
          "where ci.cartid = sc.id and ci.prodid = $1 "+
          "and sc.userid = $2", [id, req.session.userId]);


        let totalItemsInCart = await client.query(
          "select sum(quantity) as q from cart_items as ci "+
          "join shopping_carts as sc on sc.id = ci.cartid "+
          "join accounts as acc on acc.id = sc.userid where acc.id = $1", [req.session.userId]);
        let itemNum = totalItemsInCart.rows[0].q;
        req.session.itemCount = itemNum;

        res.redirect(303, '/cart');
    },
    postAddToCart: async function(req, res, next) {
        let id = req.body.id;
        let quant = req.body.quant;

        let data = await client.query(
          "select id from shopping_carts where userid = $1;", [req.session.userId]);
        let cartId = data.rows[0].id;
        let ciData = await client.query(
          "select * from cart_items where cartid = $1 and prodid = $2;", [cartId, id]);
        if(ciData.rows.length == 0){
            await client.query(
              "insert into cart_items (prodid, quantity, cartid, modified) "+
              "values($1, $2, $3, false);", [id, quant, cartId]);
        }else{
            await client.query(
              "update cart_items set quantity = quantity + $1 "+
              "where cartid = $2 and prodid = $3", [quant, cartId, id]);
        }

        let totalItemsInCart = await client.query(
          "select sum(quantity) as q from cart_items as ci "+
          "join shopping_carts as sc on sc.id = ci.cartid "+
          "join accounts as acc on acc.id = sc.userid where acc.id = $1", [req.session.userId]);
        let itemNum = totalItemsInCart.rows[0].q;
        req.session.itemCount = itemNum;
        next();
    },
    postChangeQuant: async function(req, res, next) {
        let num = req.body.num;
        let pid = req.body.pid;
        let iid = req.body.iid;
        await client.query(
          "update cart_items set quantity = $1 where id = $2 ", [num, iid]);

        let totalItemsInCart = await client.query(
          "select sum(quantity) as q from cart_items as ci "+
          "join shopping_carts as sc on sc.id = ci.cartid "+
          "join accounts as acc on acc.id = sc.userid where acc.id = $1", [req.session.userId]);
        let itemNum = totalItemsInCart.rows[0].q;
        req.session.itemCount = itemNum;
        next();
    },
    postRemoveFromCart: function(req, res) {
        let itemId = req.body.id;

        client.query("delete from cart_items as ci using shopping_carts as sc where ci.cartid = sc.id and ci.prodId = $1 and sc.userid = $2", [itemId, req.session.userId]);
    },
    postCart: function(req, res) {
        res.redirect(303, '/buy');
    }
}

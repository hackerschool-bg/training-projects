const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;
var convert = require('./convert');
var paypal = require('paypal-rest-sdk');
paypal.configure({
  mode: 'sandbox', // sandbox or live
  client_id: 'Af84lwtHLfjxnC1cMgUfwfbLvyZc17LIriaadXfkx5RtMi24w1jfTiZQfJjE5JAcvBKsHdm3FUjfJP4l', // please provide your client id here
  client_secret: 'EHK7uNglLnWc0xxXCWzk6Bl2XR9o-RprJrTm02PRy-laFJJQkWcIbwVMrq7u4q0cMNSt9p6fPY8lO427' // provide your client secret here
});

var createPay = (payment) => {
  return new Promise((resolve, reject) => {
    paypal.payment.create(payment, function (err, payment) {
      if (err) {
        reject(err);
      } else {
        resolve(payment);
      }
    });
  });
};

async function place (user, data) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(user);
  var cid = await convert.uidToCid(uid);
  var result;

  client.connect();

  try {
    result = await client.query('SELECT name FROM cart_products JOIN products on cart_products.product_id = products.id WHERE cart_id=$1 AND stock<quantity', [cid]);
  } catch (err) {
    console.log(err);
    return 'Order could not be placed';
  }

  if (result.rowCount !== 0) {
    if (result.rowCount === 1) {
      return 'There is not enough of product ' + result.rows[0].name + ' in stock';
    } else {
      var str = 'There is not enough of products ';
      for (var i = 0; i < result.rowCount; i++) {
        str += result.rows[i].name;
        if (i < result.rowCount - 1) {
          str += ', ';
        }
      }
      str += ' in stock';
      return str;
    }
  }

  try {
    result = await client.query('INSERT INTO orders(user_id,address_id) VALUES($1,$2) RETURNING id', [uid, data.addr]);
    var orderID = result.rows[0].id;
    await client.query('INSERT INTO order_products(order_id,product_id,quantity,price) SELECT $1, product_id, quantity, products.price FROM cart_products join products on product_id = products.id WHERE cart_id=$2', [result.rows[0].id, cid]);
  } catch (err) {
    console.log(err);
    return 'Order could not be placed';
  }

  try {
    result = await client.query('SELECT product_id, quantity FROM cart_products where cart_id=$1', [cid]);
    for (var j = 0; j < result.rowCount; j++) {
      await client.query('UPDATE products SET stock=stock-$1 where id=$2', [result.rows[j].quanity, result.rows[j].id]);
    }
  } catch (err) {
    console.log(err);
  }

  try {
    var total = 0;
    result = await client.query('SELECT price,quantity FROM order_products WHERE order_id=$1', [orderID]);
    for (var k = 0; k < result.rowCount; k++) {
      total += result.rows[k].price / 100 * result.rows[k].quantity;
    }
    console.log(total);
    total = total.toFixed(2);
    result = await client.query('INSERT INTO payments(order_id,type,amount) values($1,$2,$3) RETURNING id', [orderID, data.type, Math.round(total * 100)]);
  } catch (err) {
    console.log(err);
    return 'Order could not be placed';
  }

  if (data.type === '0') {
    // create payment object
    var payment = {
      intent: 'authorize',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: 'http://localhost:8080/PaySuccess',
        cancel_url: 'http://localhost:8080/err'
      },
      transactions: [{
        amount: {
          total: total,
          currency: 'USD'
        },
        description: 'Order with ID' + orderID
      }]
    };

    // call the create Pay method
    var returnUrl;
    await createPay(payment)
      .then((transaction) => {
        var id = transaction.id;
        var links = transaction.links;
        var counter = links.length;
        while (counter--) {
          if (links[counter].method === 'REDIRECT') {
          // redirect to paypal where user approves the transaction
            returnUrl = links[counter].href;
            return;
          }
        }
      })
      .catch((err) => {
        console.log(err);
        returnUrl = '/err';
      });
  } else if (data.type === 2) {
    // handle card
  }

  return { returnUrl: returnUrl, id: result.rows[0].id };
}

async function changeStatus (status, id) {
  var client = new Client({
    connectionString: connectionString
  });

  client.connect();
  try {
    await client.query('UPDATE orders SET status=$1 WHERE id=$2', [status, id]);
    if (status === 2) {
      await client.query('UPDATE payments SET is_paid=true, time_paid=NOW() WHERE order_id=$1', [id]);
    }
  } catch (err) {
    console.log(err);
    return 'Order status could not be changed';
  }
}

async function paid (id) {
  var client = new Client({
    connectionString: connectionString
  });

  client.connect();
  try {
    console.log('about to be paid');
    console.log(id);
    await client.query('UPDATE payments SET is_paid=true, time_paid=NOW() WHERE id=$1', [id]);
  } catch (err) {
    console.log(err);
    return 'Order status could not be changed';
  }
}

async function getPayTypes () {
  var client = new Client({
    connectionString: connectionString
  });

  client.connect();
  try {
    var result = await client.query('SELECT * FROM payment_type');
  } catch (err) {
    console.log(err);
    throw err;
  }
  return result.rows;
}

module.exports = {
  place,
  changeStatus,
  getPayTypes,
  paid
};

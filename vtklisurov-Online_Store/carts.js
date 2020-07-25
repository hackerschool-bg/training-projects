const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;
var convert = require('./convert');

async function removeProduct (pid, uname, forAll) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(uname);
  var cid = await convert.uidToCid(uid);

  client.connect();
  var result = await client.query('SELECT quantity FROM cart_products WHERE cart_id=$1 AND product_id=$2', [cid, pid]);
  if (result.rows[0].quantity === 1 || forAll === 'true') {
    await client.query('DELETE FROM cart_products WHERE cart_id=$1 AND product_id=$2', [cid, pid]);
  } else {
    await client.query('UPDATE cart_products SET quantity=quantity-1 WHERE cart_id=$1 AND product_id=$2', [cid, pid]);
  }
  result = await client.query('DELETE FROM carts WHERE cart_id NOT IN (SELECT cart_id from cart_products)', function (err, result) {
    if (err) {
      console.log('Error when deleting empty cart');
      console.log(err);
    }
  });

  client.end();
}

async function getProducts (uname) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(uname);

  client.connect();
  var result = await client.query('SELECT cart_id FROM carts WHERE user_id=$1', [uid]);
  if (result.rowCount === 0) {
    return undefined;
  }
  var cid = result.rows[0].cart_id;

  result = await client.query('SELECT product_id FROM cart_products WHERE cart_id=$1', [cid]);

  var pids = [];
  for (var i = 0; i < result.rowCount; i++) {
    pids.push(result.rows[i].product_id);
  }
  var items = {};
  items.product = [{}];
  var sum;
  var total = 0;
  for (i = 0; i < pids.length; i++) {
    result = await client.query('SELECT * FROM products WHERE id=$1', [pids[i]]);
    if (i !== 0) {
      items.product.push({});
    }
    items.product[i].id = result.rows[0].id;
    items.product[i].name = result.rows[0].name;
    result = await client.query('SELECT quantity, price FROM cart_products WHERE cart_id=$1 AND product_id=$2', [cid, pids[i]]);
    items.product[i].price = Number(result.rows[0].price / 100);
    items.product[i].quantity = result.rows[0].quantity;
    sum = result.rows[0].price * result.rows[0].quantity / 100;
    items.product[i].sum = sum.toFixed(2);
    total += (result.rows[0].price / 100) * result.rows[0].quantity;
  }
  items.user = uname;
  items.total = total.toFixed(2);
  return items;
}

async function addProduct (pid, user) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(user);

  client.connect();
  var cid;
  var result = await client.query('SELECT cart_id FROM carts WHERE user_id=$1', [uid]);
  if (result.rowCount === 0) {
    result = await client.query('INSERT INTO carts (user_id) values ($1) RETURNING cart_id', [uid]);
    cid = result.rows[0].cart_id;
  } else if (result.rowCount !== 1) {
    var err = Error('Repeating cart_id');
    throw (err);
  } else {
    cid = result.rows[0].cart_id;
  }

  var price = 0;
  result = await client.query('SELECT price FROM products WHERE id=$1', [pid]);
  if (result.rowCount === 1) {
    price = Number(result.rows[0].price);
  } else {
    err = new Error('Repeating product id');
    throw (err);
  }

  result = await client.query('SELECT * FROM cart_products WHERE cart_id=$1 AND product_id=$2', [cid, pid]);
  if (result.rowCount === 0) {
    await client.query('INSERT INTO cart_products (cart_id, product_id, price) VALUES ($1,$2,$3)', [cid, pid, price]);
  } else {
    await client.query('UPDATE cart_products SET quantity=quantity+1 WHERE cart_id=$1 AND product_id=$2', [cid, pid]);
  }

  client.end();
}

async function deleteExpired () {
  var client = new Client({
    connectionString: connectionString
  });

  client.connect();

  client.query('DELETE FROM cart_products WHERE cart_id IN (SELECT cart_id from carts WHERE "created" < NOW() - INTERVAL \'2 minutes\')', function (err, result) {
    if (err) {
      console.log('Error when deleting products from expired carts');
      console.log(err);
    }
  });
  client.query('DELETE FROM carts WHERE "created" < NOW() - INTERVAL \'2 minutes\'', function (err, result) {
    if (err) {
      console.log('Error when deleting expired carts');
      console.log(err);
    }
  });
}

async function checkStock (user) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(user);
  var cid = await convert.uidToCid(uid);
  var result;

  client.connect();

  result = await client.query('SELECT name FROM cart_products JOIN products on cart_products.product_id = products.id WHERE cart_id=$1 AND stock<quantity', [cid]);

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
  } else {
    return 'Ok';
  }
}

async function removeAll (user) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(user);
  var cid = await convert.uidToCid(uid);

  client.connect();
  await client.query('DELETE FROM cart_products WHERE cart_id=$1', [cid]);
  await client.query('DELETE FROM carts WHERE cart_id=$1', [cid]);
}

module.exports = {
  getProducts,
  addProduct,
  removeProduct,
  deleteExpired,
  checkStock,
  removeAll
};

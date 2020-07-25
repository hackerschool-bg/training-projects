const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;

async function generateHTML () {
  var client = new Client({
    connectionString: connectionString
  });

  client.connect();
  try {
    var result = await client.query('SELECT random() as rnd, * FROM products WHERE for_sale=true and stock>0 ORDER BY rnd LIMIT 100');
  } catch (err) {
    return err.message;
  }
  var numprod;
  if (result.rowCount === 0) {
    return 'Error in the database';
  }
  if (result.rowCount > 100) {
    numprod = 100;
  } else {
    numprod = result.rowCount;
  }

  var obj = {};
  obj.prod = [];
  var price;
  for (var i = 0; i < numprod; i++) {
    price = result.rows[i].price / 100;
    obj.prod.push({});
    obj.prod[i].img = result.rows[i].image_loc;
    obj.prod[i].name = result.rows[i].name;
    obj.prod[i].price = price.toFixed(2);
    obj.prod[i].id = result.rows[i].id;
  }
  return obj;
}

module.exports = {
  generateHTML
};

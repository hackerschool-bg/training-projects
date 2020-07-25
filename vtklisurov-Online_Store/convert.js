const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;

async function unameToUid (uname) {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  var uid;
  var err;
  var result = await client.query('SELECT user_id FROM users WHERE username=$1', [uname]);
  if (result.rowCount === 0) {
    err = Error('User ' + uname + " doesn't exist");
    throw (err);
  } else if (result.rowCount !== 1) {
    err = Error('Repeating usernames');
    throw (err);
  } else {
    uid = result.rows[0].user_id;
  }
  client.end();
  return uid;
}

async function uidToCid (uid) {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  var cid;
  var err;
  var result = await client.query('SELECT cart_id FROM carts WHERE user_id=$1', [uid]);
  if (result.rowCount === 0) {
    err = Error("Cart doesn't exist");
    throw (err);
  } else if (result.rowCount !== 1) {
    err = Error('Repeating carts');
    throw (err);
  } else {
    cid = result.rows[0].cart_id;
  }
  client.end();
  return cid;
}

module.exports = {
  unameToUid,
  uidToCid
};

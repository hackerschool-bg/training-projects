const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;
var convert = require('./convert');

async function saveAddr (data, user) {
  var client = new Client({
    connectionString: connectionString
  });

  if (!user) {
    return 'You are not logged in';
  }
  if (!data.country || !data.city || !data.postal || !data.straddr) {
    return 'All fields are required';
  }

  var uid = await convert.unameToUid(user);

  try {
    await client.query('INSERT INTO addresses(user_id,country,postal,city,str_address) VALUES($1,$2,$3,$4,$5)', [uid, data.country, data.postal, data.city, data.straddr]);
  } catch (err) {
    return 'There was a problem saving the address';
  }

  return 'Address saved';
}

async function getAddr (user) {
  var client = new Client({
    connectionString: connectionString
  });

  var uid = await convert.unameToUid(user);

  client.connect();
  try {
    var result = await client.query('SELECT * FROM addresses WHERE user_id=$1', [uid]);
  } catch (err) {
    console.log(err);
    throw err;
  }
  if (result.rowCount === 0) {
    var err = new Error("User doesn't have an address");
    throw err;
  } else {
    return result.rows;
  }
}

module.exports = {
  saveAddr,
  getAddr
};

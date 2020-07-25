const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;

async function checkHash (email, hash) {
  var client = new Client({
    connectionString: connectionString
  });
  var sql = 'select hash from users where email = $1';
  client.connect();
  var res;
  var result = await client.query(sql, [email]);
  try {
    if (result.rowCount === 0) {
      client.end();
      throw new Error('Email not found');
    }
    if (hash !== result.rows[0].hash) {
      client.end();
      throw new Error("Token doesn't match");
    }
    res = await verify(email);
    client.end();
    if (res !== 'Ok') {
      throw new Error(res);
    }
    return res;
  } catch (err) {
    return err;
  }
  // if(result.rowCount==0){
  //   client.end();
  //   return 1;
  // }
  // if (hash==result.rows[0].hash) {
  //   res = await verify(email);
  //   client.end();
  //   return res;
  // } else {
  //   //use error throwing
  //   client.end();
  //   res = 1;
  //   return res;
  // }
}

async function verify (email) {
  var client = new Client({
    connectionString: connectionString
  });
  var sql = 'update only users set status=1 where email=$1 and status=0;';
  client.connect();
  var status;
  await client.query(sql, [email], function (err, result) {
    status = 0;
    if (err) {
      return 'Error with the database';
    }
    if (result.rowCount === 0) {
      status = 1;
    }
    client.end();
  });
  try {
    if (status === 1) {
      throw new Error('Email is already verified');
    }
  } catch (err) {
    return err;
  }
  return 'Ok';
}

module.exports = {
  checkHash
};

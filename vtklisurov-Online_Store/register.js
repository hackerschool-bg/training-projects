var md5 = require('md5');
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');
var saltrounds = 12;
const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;

async function checkData (data) {
  var client = new Client({
    connectionString: connectionString
  });

  if (!data.uname || !data.email || !data.pass || !data.pass2 || !data.fname || !data.lname) {
    return 'All fields are required';
  }
  if (data.pass !== data.pass2) {
    return 'Passwords do not match';
  }

  client.connect();
  var result = await client.query('SELECT username, email FROM users WHERE username=$1 OR username IN (SELECT username FROM staff WHERE username=$1)', [data.uname]);

  if (result.rowCount !== 0) {
    return 'Username exists';
  } else {
    result = await client.query('SELECT username, email FROM users WHERE email=$1 OR email IN (SELECT username FROM staff WHERE username=$1)', [data.email]);
    if (result.rowCount !== 0) {
      return 'Email exists';
    } else {
      return 'All good';
    }
  }
}

async function saveUser (username, pass, fname, lname, email, isAdmin) {
  var client = new Client({
    connectionString: connectionString
  });

  var hash = await md5(Math.floor(Math.random() * 1000));

  bcrypt.hash(pass, saltrounds, function (err, hashedpass) {
    if (err) {
      return 'Error with the password hashing';
    }
    client.connect();
    if (isAdmin) {
      client.query('INSERT INTO staff (username, pass, fname, lname, email) VALUES ($1,$2,$3,$4,$5)', [username, hashedpass, fname, lname, email], function (err, result) {
        if (err) {
          console.log(err);
          return 'Error in the database';
        }
        client.end();
      });
    } else {
      client.query('INSERT INTO users (username, pass, fname, lname, email, hash) VALUES ($1,$2,$3,$4,$5,$6)', [username, hashedpass, fname, lname, email, hash], function (err, result) {
        if (err) {
          console.log(err);
          return 'Error in the database';
        }
        client.end();
      });
    }
  });

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vtklisurov@gmail.com',
      pass: 'Dell+Toshib@123'
    }
  });

  var mailOptions = {
    from: 'online_store_task@gmail.com',
    to: email,
    subject: 'Account Verification',
    text: 'Please click this link to verify your account http://localhost:8080/verify/' + email + '/' + hash
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
  client.end();
}

async function deleteUnverified () {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  await client.query('DELETE FROM users WHERE status=0 AND "created" < NOW() - INTERVAL \'15 minutes\';', function (err, result) {
    if (err) {
      console.log(err);
    }
  });
  client.end();
}

module.exports = {
  checkData,
  // saveAdmin,
  saveUser,
  deleteUnverified
};

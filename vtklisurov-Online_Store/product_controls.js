const { Client } = require('pg');
const connectionString = require('./connector.js').connectionString;
var fs = require('fs');

function update (toUpdate, files) {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  var ext;
  var pic;
  if (files.pic) {
    pic = files.pic.name;
    ext = files.pic.name.split('.').pop();
    var oldpath = files.pic.path;
    var newpath = '/home/velin/Documents/Online_Store/images/' + toUpdate.pid + '.' + ext;
    fs.rename(oldpath, newpath, function (err) {
      if (err) {
        throw err;
      }
    });
  } else {
    pic = 'placeholder.png';
  }
  if (pic === 'placeholder.png') {
    client.query('UPDATE products SET name=COALESCE($1,name),description=COALESCE($2,name),stock=COALESCE($3,stock),price=COALESCE($4,price) WHERE id=$5', [toUpdate.name ? toUpdate.name : null, toUpdate.description ? toUpdate.description : null, toUpdate.stock ? toUpdate.stock : null, toUpdate.price ? toUpdate.price * 100 : null, toUpdate.pid], function (err, result) {
      if (err) {
        console.log(err);
        return 'Error in the database';
      }
      client.end();
    });
  } else {
    client.query('UPDATE products SET name=COALESCE($1,name),image_loc=COALESCE($2,image_loc),description=COALESCE($3,name),stock=COALESCE($4,stock),price=COALESCE($5,price) WHERE id=$6', [toUpdate.name ? toUpdate.name : null, './images/' + toUpdate.pid + '.' + ext, toUpdate.description ? toUpdate.description : null, toUpdate.stock ? toUpdate.stock : null, toUpdate.price ? toUpdate.price * 100 : null, toUpdate.pid], function (err, result) {
      if (err) {
        console.log(err);
        return 'Error in the database';
      }
      client.end();
    });
  }
}

function add (toAdd, files) {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  client.query('INSERT INTO products (name,description,stock,price) VALUES ($1,$2,$3,$4) RETURNING id', [toAdd.name, toAdd.description, toAdd.stock, toAdd.price * 100], function (err, result) {
    if (err) {
      console.log('From the adding:');
      console.log(err);
      return 'Error in the database';
    }
    var ext;
    var pic;
    if (files.pic) {
      pic = files.pic.name;
      ext = files.pic.name.split('.').pop();
      var oldpath = files.pic.path;
      var newpath = '/home/velin/Documents/Online_Store/images/' + result.rows[0].id + '.' + ext;
      fs.rename(oldpath, newpath, function (err) {
        if (err) {
          throw err;
        }
      });
    } else {
      pic = 'placeholder.png';
    }

    if (result && pic !== 'placeholder.png') {
      client.query('UPDATE products SET image_loc=$1 WHERE id=$2', ['./images/' + result.rows[0].id + '.' + ext, result.rows[0].id], function (err, result) {
        if (err) {
          console.log('From the adding(part 2):');
          console.log(err);
          return 'Error in the database';
        }
        client.end();
      });
    }
  });
}

function remove (toRemove) {
  var client = new Client({
    connectionString: connectionString
  });
  client.connect();
  client.query('UPDATE products SET for_sale=false WHERE id=$1', [toRemove.pid], function (err, result) {
    if (err) {
      console.log(err);
      return 'Error in the database';
    }
    client.end();
  });
}

module.exports = {
  update,
  add,
  remove
};

const sqlite = require('sqlite');

let db;

init();

async function init () {
  db = await sqlite.open('/home/ros/Desktop/repo/RosenW-DaliPeche/node-koa/src/database/forecast.db');
  console.log('connected');
}

const select = async (table, where, { one, like, count, or }) => {
  if (db == null) {
    await init();
  }

  if (or == null) or = false;
  if (one == null) one = false;
  if (like == null) like = false;
  if (count == null) count = false;

  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  const selectValue = count ? 'COUNT(*) as count' : '*';
  const operator = like ? 'LIKE' : '=';
  // TODO choose a name
  // const operator = or ? 'OR' : 'AND';

  let whereStatement = '';

  let first = true;
  for (const key of whereKeys) {
    if (first) {
      whereStatement += `WHERE ${key} ${operator} ?`;
      first = false;
    } else {
      whereStatement += ` ${or ? 'OR' : 'AND'} ${key} ${operator} ?`;
    }
  }

  const wholeStatement = `SELECT ${selectValue} FROM ${table} ${whereStatement}`;

  console.log(wholeStatement);

  if (one) {
    return db.get(wholeStatement, whereValues);
  }

  return db.all(wholeStatement, whereValues);
}

const insert = async (table, data) => {
  if (db == null) {
    await init();
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const wholeStatement = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${values.map((v) => '?').join(', ')})`;

  console.log(wholeStatement);

  return db.run(wholeStatement, values);
}

const update = async (table, updateData, where) => {
  if (db == null) {
    await init();
  }

  const updateKeys = Object.keys(updateData);
  const updateValues = Object.values(updateData);

  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  const updateStatement = updateKeys.map((key) => `${key} = ?`).join(', ');

  let whereStatement = '';

  let first = true;
  for (const key of whereKeys) {
    if (first) {
      whereStatement += `WHERE ${key} = ?`;
      first = false;
    } else {
      whereStatement += ` AND ${key} = ?`;
    }
  }

  const wholeStatement = `UPDATE ${table} SET ${updateStatement} ${whereStatement}`;

  console.log(wholeStatement);

  return db.run(wholeStatement, updateValues.concat(whereValues));
}


const del = async (table, where) => {
  if (db == null) {
    await init();
  }

  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  let whereStatement = '';

  let first = true;
  for (const key of whereKeys) {
    if (first) {
      whereStatement += `WHERE ${key} = ?`;
      first = false;
    } else {
      whereStatement += ` AND ${key} = ?`;
    }
  }

  const wholeStatement = `DELETE FROM ${table} ${whereStatement}`;

  console.log(wholeStatement);

  return db.run(wholeStatement, whereValues);
}

module.exports = {
    update,
    select,
    insert,
    del
  };

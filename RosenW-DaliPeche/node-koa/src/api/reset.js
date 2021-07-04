const Database = require('./../database/db.js');
const db = Database('pg');

resetAPIKeys();

function resetAPIKeys () {
  db.sql(`UPDATE api_keys SET use_count = 0`);
}

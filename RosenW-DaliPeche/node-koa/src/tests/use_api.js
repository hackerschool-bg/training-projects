const fetch = require("node-fetch");
const Database = require('./../database/db.js');
const db = Database('pg');

(async () => {
  const keys = (await db.sql(`SELECT * FROM api_keys where user_id between 10 and 10012`)).map((k) => k.key);
  for (const key of keys) {
    await fetch('http://127.0.0.1:3001/api/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({city: 'Sofia', key})
      }
    );
  }
})();

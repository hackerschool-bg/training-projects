let pg = require('pg');
// Database connection
const client = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'online_shop_db',
    password: '1234',
    port: 5432
});
client.connect();

module.exports = client;
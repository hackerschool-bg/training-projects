function init (dbName) {
	const db = require(`./../database/${dbName}_db.js`);

	return {
		sql: db.sql,
		makeTransaction: db.makeTransaction
	}
}

module.exports = init

const Database = require('./../database/db.js');
const db = Database('pg');
const {
  generateRandomString,
  validateEmail,
  isObject,
  isInteger,
} = require('./../utils/utils.js');
const {
  DEFAULT_PORT,
  MINIMUM_USERNAME_LENGTH,
  MINIMUM_PASSWORD_LENGTH,
  MAX_REQUESTS_PER_HOUR,
  MAXIMUM_CREDITS_ALLOWED,
  MERCHANT_ID,
  CREDIT_CARD_PRIVATE_KEY,
  CREDIT_CARD_PUBLIC_KEY,
  SALT_ROUNDS,
  SALT_LENGTH,
  APPROVE_CREDIT_TRANSFER_BOUNDARY,
  API_KEY_LENGTH
} = require('./../utils/consts.js');
const bcrypt = require('bcrypt');

async function addUsers (userCount, credits, password) {
	for (let i = 0; i < userCount; i++) {
		if (i % 1000 === 0) {
      console.log(`${i} / ${userCount}`);
    }

  	const salt = generateRandomString(SALT_LENGTH);
		const saltedPassword = password + salt;
	  const hash = await bcrypt.hash(saltedPassword, SALT_ROUNDS);
	  const email = `${generateRandomString(12)}@gmail.com`;
	  const username = `${generateRandomString(12)}`;

	  db.sql(
	    `INSERT INTO users (date_registered, password, email, username, salt, credits)
	      VALUES ($1, $2, $3, $4, $5, $6)`,
	    new Date(),
	    hash,
	    email,
	    username,
	    salt,
	    credits
	  );
	}
}

async function addCities (cityCount) {
  for (let i = 1; i <= cityCount; i++) {
    if (i % 1000 === 0) {
      console.log(`${i} / ${cityCount}`);
    }

    await db.sql(`INSERT INTO cities (name, country_code, lng, lat) VALUES ($1, $2, $3, $4)`, generateRandomString(Math.floor(Math.random() * 20) + 12), 'FK', Math.random(), Math.random());
  }
}

async function addAPIKeysToUsers (keyCount = 1) {
	const users = await db.sql(`SELECT * FROM users`);

	for (const user of users) {
		const APIKey = generateRandomString(API_KEY_LENGTH);
		await db.sql(`INSERT INTO api_keys (key, user_id) VALUES ($1, $2)`, APIKey, user.id);
	}
}

const db = require('./db');
const { log } = require('./utils');
const { assertApp } = require('./error-handling');
const { defineMethods, search } = require('../methods/resolve-method');

const callAPI = defineMethods(search);

async function selectEmailsToNotify (db) {
  // TODO esub -> subcr or es
  // renames are 4 symbols max
  return db.all(`
      SELECT esub.id, esub.email, esub.subscription_id, esub.date_from, esub.date_to 
      FROM email_subscriptions esub
      LEFT JOIN fetches ON esub.fetch_id_of_last_send = fetches.id
      GROUP BY esub.id
      HAVING fetches.timestamp IS NULL OR 
        fetches.timestamp < MAX(fetches.timestamp);
  `);
}

async function newRoutesForEmailSub (emailSub) {
  const rows = await db.selectWhere(
    'subscriptions',
    ['airport_from_id', 'airport_to_id'],
    { 'id': emailSub.subscription_id },
  );

  assertApp(rows.length === 1,
    `email subscription with ID=${emailSub.id} has more than one subscription associated with it`,
  );

  const params = {
    v: '1.0',
    fly_from: rows[0].airport_from_id.toString(),
    fly_to: rows[0].airport_to_id.toString(),
    date_from: emailSub.date_from,
    date_to: emailSub.date_to,
  };

  return callAPI(
    'search',
    params,
    db,
  );
}

async function notifyEmailSubscriptions () {
  const emails = await selectEmailsToNotify(db);

  for (const email of emails) {
    try {
      const routes = await newRoutesForEmailSub(email);
      // TODO send email here
      // only log that there are emails to send for now
      if (routes.status_code === 1000) {
        log(email.email, 'needs to be notified');
      } else {
        log(email.email, 'does not need to be notified');
      }
    } catch (e) {
      log(e);
    }
  }
}

module.exports = {
  notifyEmailSubscriptions,
};

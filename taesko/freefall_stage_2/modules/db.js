module.exports = (() => {
  const path = require('path');
  const sqlite = require('sqlite');
  const { assertApp, assertPeer } = require('./error-handling');
  const { isObject } = require('lodash');
  const { log } = require('./utils');
  let db;

  async function dbConnect () {
    if (
      isObject(db) &&
      isObject(db.driver) &&
      db.driver.open
    ) {
      log('Already connected to freefall.db...');
    } else {
      log('Connecting to freefall.db...');
      db = await sqlite.open(path.join(__dirname, '../freefall.db'));
      await db.run('PRAGMA foreign_keys = ON;');
      await db.run('PRAGMA integrity_check;');
      log('freefall.db OK');
    }
  }

  function assertDB () {
    assertApp(
      isObject(db) &&
      isObject(db.driver) &&
      db.driver.open,
      'No database connection.',
    );
  }

  function stringifyColumns (columns) {
    assertApp(
      columns instanceof Array &&
      columns.length > 0,
      'Invalid argument columns.',
    );

    return columns.join(', ');
  }

  async function all (statement) {
    assertDB();
    return db.all(statement);
  }

  async function select (table, columns) {
    assertDB();
    assertApp(
      typeof table === 'string',
      'Expected string for a name of table',
    );

    // TODO sql injection ?
    return db.all(`SELECT ${stringifyColumns(columns)} FROM ${table};`);
  }

  async function selectWhere (table, columns, where) {
    assertDB();
    assertApp(
      typeof table === 'string' &&
      Array.isArray(columns) &&
      isObject(where) &&
      Object.keys(where).length === 1, // TODO add support for more than one
      'Invalid select data',
    );

    const whereCol = Object.keys(where)[0];

    return db.all(`SELECT ${stringifyColumns(columns)} FROM ${table} WHERE ${whereCol} = ?;`,
      [where[whereCol]],
    );
  }

  async function selectRoutesFlights (fetchId, params) {
    assertDB();
    assertApp(
      Number.isInteger(fetchId),
      'Invalid fetch id.',
    );

    const queryParams = [fetchId];

    let query = `

      SELECT
      routes.id AS routeId,
      routes.booking_token AS bookingToken,
      routes.price,
      airlines.name AS airlineName,
      airlines.logo_url AS logoURL,
      afrom.name AS afromName,
      afrom.id AS afromId,
      ato.name AS atoName,
      ato.id AS atoId,
      flights.dtime,
      flights.atime,
      flights.flight_number AS flightNumber,
      routes_flights.is_return AS isReturn
      FROM routes
      LEFT JOIN routes_flights ON routes_flights.route_id = routes.id
      LEFT JOIN flights ON routes_flights.flight_id = flights.id
      LEFT JOIN airports as afrom ON afrom.id = flights.airport_from_id
      LEFT JOIN airports as ato ON ato.id = flights.airport_to_id
      LEFT JOIN airlines ON airlines.id = flights.airline_id
      WHERE routes.fetch_id = ?

    `;

    if (params.price_to) {
      assertPeer(Number.isInteger(params.price_to), 'Invalid price in search request.');
      query += ' AND routes.price <= ? ';
      queryParams.push(params.price_to);
    }

    // TODO finish filtration

    if (params.date_from) {
      assertPeer(typeof params.date_from === 'string', 'Invalid date_from in search request.');
      query += ' AND flights.dtime >= ?';
      queryParams.push(params.date_from);
    }

    if (params.date_to) {
      assertPeer(typeof params.date_to === 'string', 'Invalid date_to in search request.');
      query += ' AND flights.atime <= ?';
      queryParams.push(params.date_to);
    }

    query += ';';

    const routesFlights = await db.all(query, queryParams);

    assertApp(
      Array.isArray(routesFlights),
      'Invalid db routes and flights response.',
    );

    return routesFlights;
  }

  async function selectSubscriptions (airportFromId, airportToId) {
    assertDB();
    assertApp(
      Number.isInteger(airportFromId) &&
      Number.isInteger(airportToId),
      'Invalid airport ids.',
    );

    const subscriptions = await db.all(`

      SELECT fetches.id AS fetchId, fetches.timestamp FROM fetches
      LEFT JOIN subscriptions ON fetches.subscription_id = subscriptions.id
      WHERE subscriptions.airport_from_id = ? AND subscriptions.airport_to_id = ?
      GROUP BY subscriptions.airport_from_id, subscriptions.airport_to_id
      HAVING MAX(fetches.timestamp);

    `, [airportFromId, airportToId]);

    assertApp(
      Array.isArray(subscriptions),
      'Invalid db select subscription response.',
    );

    return subscriptions;
  }

  async function insert (table, data) {
    assertDB();
    assertApp(
      typeof table === 'string' &&
      isObject(data),
      'Invalid insert data.',
    );

    const columns = [];
    const values = [];

    for (const [col, value] of Object.entries(data)) {
      columns.push(col);
      values.push(value);
    }

    const columnsStringified = columns.join(', ');
    const rowStringified = Array(values.length).fill('?').join(', ');
    const insertResult = await db.run(`INSERT INTO ${table} (${columnsStringified}) VALUES (${rowStringified});`,
      values,
    );

    assertApp(
      isObject(insertResult) &&
      isObject(insertResult.stmt) &&
      Number.isInteger(insertResult.stmt.lastID),
      'Incorrect db response.',
    );

    return insertResult.stmt.lastID;
  }

  async function insertDataFetch (subscriptionId) {
    assertDB();

    const newFetchResult = await db.run(
      'INSERT INTO fetches(timestamp, subscription_id) VALUES (strftime(\'%Y-%m-%dT%H:%M:%SZ\' ,\'now\'), ?);',
      [subscriptionId],
    );

    assertApp(
      isObject(newFetchResult) &&
      isObject(newFetchResult.stmt) &&
      Number.isInteger(newFetchResult.stmt.lastID),
      'Incorrect db response.',
    );

    return newFetchResult.stmt.lastID;
  }

  async function insertIfNotExists (table, data, existsCheck) {
    assertDB();

    const found = await selectWhere(table, Object.keys(data), existsCheck);

    assertApp(Array.isArray(found), 'Invalid db response.');

    if (found.length > 0) {
      assertApp(found.length === 1, 'Invalid db response.');

      // return flightIdResult[0].id;
      return false;
    }

    const insertResult = await insert(table, data);

    assertApp(
      Number.isInteger(insertResult),
      'Incorrect db response.',
    );

    return true;
  }

  // TODO move out with selectSubs...
  async function insertEmailSubscription ({
    email,
    airportFromId,
    airportToId,
    dateFrom,
    dateTo,
  }) {
    const subs = await db.all(
      `
      SELECT id
      FROM subscriptions
      WHERE airport_from_id=? AND airport_to_id=?
      ;
      `,
      airportFromId, airportToId,
    );
    assertApp(subs.length ===
              1, `Found more than one unique subscription between two airports with ids from=${airportFromId} to=${airportToId}`);

    log('Subscribing to email:', email, 'with dates:', dateFrom, dateTo);

    try {
      await insert('email_subscriptions', {
        email,
        subscription_id: subs[0].id,
        fetch_id_of_last_send: null,
        date_from: dateFrom,
        date_to: dateTo,
      });
      log('Successfully subscribed email: ', email);
      return true;
    } catch (e) {
      log('While subscribing email: ', email, 'an error occurred: ', e);
      return false;
    }
  }

  async function insertIfNotExistsSub (flyFrom, flyTo) {
    assertDB();

    const flyFromParsed = Number(flyFrom);
    const flyToParsed = Number(flyTo);
    const subscriptions = await db.all(`
      SELECT id
      FROM subscriptions
      WHERE airport_from_id = ? AND airport_to_id = ?;
    `, [
      flyFromParsed,
      flyToParsed,
    ]);

    assertApp(Array.isArray(subscriptions), 'Invalid select subscriptions response.');

    if (subscriptions.length > 0) {
      assertApp(subscriptions.length ===
                1, `Unexpected subscriptions length of ${subscriptions.length}.`);

      return false;
    } else {
      await insert('subscriptions', {
        airport_from_id: flyFromParsed,
        airport_to_id: flyToParsed,
      });

      return true;
    }
  }

  async function delIfNotExistsSub (flyFrom, flyTo) {
    assertDB();

    const flyFromParsed = Number(flyFrom);
    const flyToParsed = Number(flyTo);

    const deleteResult = await db.run(`

      DELETE FROM subscriptions
      WHERE airport_from_id = ? AND airport_to_id = ?;

    `, [flyFromParsed, flyToParsed]);

    assertApp(
      isObject(deleteResult) &&
      isObject(deleteResult.stmt) &&
      Number.isInteger(deleteResult.stmt.changes),
      'Incorrect db response.',
    );

    return deleteResult.stmt.changes > 0;
  }

  async function delIfNotExistsEmailSub (email) {
    assertDB();

    log('deleting subscriptions of email: ', email);

    const deleteResult = await db.run(
      `
      DELETE FROM email_subscriptions
      WHERE email_subscriptions.email=?
      ;
    `, email,
    );

    log('delete query result: ', deleteResult);
    return deleteResult.stmt.changes > 0;
  }

  return {
    all,
    select,
    insert,
    insertDataFetch,
    insertIfNotExists,
    insertIfNotExistsSub,
    insertEmailSubscription,
    selectSubscriptions,
    selectRoutesFlights,
    selectWhere,
    delIfNotExistsSub,
    delIfNotExistsEmailSub,
    dbConnect,
  };
})();

// This server works with ISO 8601 time standard.
const SERVER_TIME_FORMAT = 'Y-MM-DDTHH:mm:ssZ';
const KIWI_API_DATE_FORMAT = 'DD/MM/Y';
const ROUTES_LIMIT = 30;
const {
  dbConnect,
  select,
  insertDataFetch,
  insertIfNotExists,
  selectWhere,
  insert,
} = require('../modules/db');
const { handleError, assertApp, assertPeer } = require('../modules/error-handling');
const { log, requestJSON, toSmallestCurrencyUnit } = require('../modules/utils');
const { isObject, each } = require('lodash');
const moment = require('moment');

process.on('error', (err) => {
  handleError(err);
});

process.on('unhandledRejection', (err) => {
  handleError(err);
});

async function start () {
  await dbConnect();
  const subscriptions = await select('subscriptions', ['id', 'airport_from_id', 'airport_to_id']);

  assertApp(Array.isArray(subscriptions), 'Invalid select subscriptions response.');

  // TODO use JSON validator

  // GET airlines
  const airlines = await requestJSON('https://api.skypicker.com/airlines');
  const iataCodePattern = /^[A-Z0-9]+$/;

  await Promise.all(airlines.map((airline) => {
    assertPeer(
      isObject(airline) &&
      typeof airline.id === 'string' &&
      typeof airline.name === 'string' &&
      (iataCodePattern.test(airline.id) || airline.id === '__'), // '__' is 'FakeAirline'
      'API sent invalid airlines response.'
    );

    // ignore '__', it is 'FakeAirline', stored in Kiwi API
    if (airline.id === '__') {
      return Promise.resolve();
    }

    log(`Inserting if not exists airline ${airline.name} (${airline.id})...`);

    return insertIfNotExists('airlines', {
      name: `${airline.name} (${airline.id})`,
      code: airline.id,
      logo_url: `https://images.kiwi.com/airlines/64/${airline.id}.png`,
    }, {
      code: airline.id,
    });
  }));

  // GET routes

  for (const sub of subscriptions) {
    assertApp(
      isObject(sub) &&
      Number.isInteger(sub.id) &&
      Number.isInteger(sub.airport_from_id) &&
      Number.isInteger(sub.airport_to_id),
      'Invalid subscription data.'
    );

    const fetchId = await insertDataFetch(sub.id);
    const [airportFrom, airportTo] = await Promise.all([
      selectWhere('airports', ['id', 'iata_code', 'name'], {
        id: sub.airport_from_id,
      }).then((r) => r[0]),
      selectWhere('airports', ['id', 'iata_code', 'name'], {
        id: sub.airport_to_id,
      }).then((r) => r[0]),
    ]);

    // assertApp(
    //   Array.isArray(airports) &&
    //   airports.length === 2 &&
    //   airports.every((airport) => {
    //     return Array.isArray(airport) &&
    //       airport.length === 1 &&
    //       isObject(airport[0]) &&
    //       Number.isInteger(airport[0].id) &&
    //       typeof airport[0].iata_code === 'string' &&
    //       typeof airport[0].name === 'string';
    //   }),
    //   'Invalid airports data.'
    // );

    const airportEndPoints = {
      airportFrom: airportFrom.iata_code,
      airportTo: airportTo.iata_code,
    };

    await getSubscriptionData(airportEndPoints, fetchId, 0);
  }

  log(`Checked ${subscriptions.length} subscriptions.`);
}

async function getSubscriptionData (airportEndPoints, fetchId, offset) {
  const { airportFrom, airportTo } = airportEndPoints;
  assertApp(
    typeof airportFrom === 'string' &&
    typeof airportTo === 'string',
    'Invalid airport data.'
  );

  const flightsHash = {};
  const airportsSet = [];

  const response = await requestJSON('https://api.skypicker.com/flights', {
    flyFrom: airportFrom,
    to: airportTo,
    dateFrom: moment().format(KIWI_API_DATE_FORMAT),
    dateTo: moment().add(1, 'months').format(KIWI_API_DATE_FORMAT),
    typeFlight: 'oneway',
    partner: 'picky',
    v: '2',
    xml: '0',
    locale: 'en',
    offset: offset,
    limit: ROUTES_LIMIT,
  });

  assertPeer(
    isObject(response) &&
    Array.isArray(response.data) &&
    typeof response.currency === 'string',
    'API sent invalid data response.'
  );

  each(response.data, (data) => {
    assertPeer(
      isObject(data) &&
      typeof data.booking_token === 'string' &&
      Number.isInteger(data.price) &&
      Array.isArray(data.route),
      'API sent invalid route response.'
    );

    each(data.route, (flight) => {
      assertPeer(
        isObject(flight) &&
        Number.isInteger(flight.flight_no) &&
        Number.isInteger(flight.aTimeUTC) &&
        Number.isInteger(flight.dTimeUTC) &&
        (flight.return === 0 || flight.return === 1) &&
        typeof flight.flyFrom === 'string' &&
        typeof flight.flyTo === 'string' &&
        flight.flyFrom !== flight.flyTo &&
        typeof flight.airline === 'string' &&
        typeof flight.id === 'string',
        'API sent invalid flight response.'
      );

      flightsHash[flight.id] = flightsHash[flight.id] || flight;
      if (!airportsSet.includes(flight.flyFrom)) {
        airportsSet.push(flight.flyFrom);
      }
      if (!airportsSet.includes(flight.flyTo)) {
        airportsSet.push(flight.flyTo);
      }
    });
  });

  log(`FROM ${airportFrom} to ${airportTo} (offset: ${offset}): data for ${airportsSet.length} airports. Getting data...`);

  await Promise.all(airportsSet.map((IATACode) => {
    return getAirportIfNotExists(IATACode);
  }));

  log('Finished getting data for airports.');

  log(`FROM ${airportFrom} to ${airportTo} (offset: ${offset}): data for ${Object.keys(flightsHash).length} flights. Getting data...`);

  await Promise.all(Object.values(flightsHash).map(async (flight) => {
    const airportCodes = [flight.flyFrom, flight.flyTo];
    const airportIds = await Promise.all(airportCodes.map(async (IATACode) => {
      const selectResult = await selectWhere('airports', ['id'], {
        iata_code: IATACode,
      });

      assertApp(
        Array.isArray(selectResult) &&
        selectResult.length === 1 &&
        Number.isInteger(selectResult[0].id),
        'Invalid database airport response.'
      );

      return selectResult[0].id;
    }));

    const airlineIdResult = await selectWhere('airlines', ['id'], {
      code: flight.airline,
    });

    assertApp(
      Array.isArray(airlineIdResult) &&
      airlineIdResult.length === 1 &&
      Number.isInteger(airlineIdResult[0].id),
      'Invalid db response.'
    );

    log(`Inserting if not exists flight ${flight.airline} ${flight.flight_no} from ${flight.flyFrom} to ${flight.flyTo} departure time ${moment.unix(flight.dTimeUTC).format(SERVER_TIME_FORMAT)} ...`);

    return insertIfNotExists('flights', {
      airline_id: airlineIdResult[0].id,
      airport_from_id: airportIds[0],
      airport_to_id: airportIds[1],
      dtime: moment.unix(flight.dTimeUTC).format(SERVER_TIME_FORMAT),
      atime: moment.unix(flight.aTimeUTC).format(SERVER_TIME_FORMAT),
      flight_number: flight.flight_no,
      remote_id: flight.id,
    }, {
      remote_id: flight.id,
    });
  }));

  log('Finished getting data for flights.');

  log(`FROM ${airportFrom} to ${airportTo} (offset: ${offset}): data for ${response.data.length} routes. Getting data...`);

  const routesPromises = response.data.map(async (data) => {
    const routeId = await insert('routes', {
      booking_token: data.booking_token,
      price: toSmallestCurrencyUnit(data.price),
      fetch_id: fetchId,
    });

    const flightsPromises = data.route.map(async (flight) => {
      log(`Inserting route ${routeId} flight ${flight.airline} ${flight.flight_no} from ${flight.flyFrom} to ${flight.flyTo} departure time ${moment.unix(flight.dTimeUTC).format(SERVER_TIME_FORMAT)} ...`);

      const flightIdResults = await selectWhere('flights', ['id'], {
        remote_id: flight.id,
      });

      assertApp(
        Array.isArray(flightIdResults) &&
        flightIdResults.length === 1 &&
        Number.isInteger(flightIdResults[0].id),
        'Invalid db select flight id response.'
      );

      return insert('routes_flights', {
        flight_id: flightIdResults[0].id,
        route_id: routeId,
        is_return: flight.return,
      });
    });

    await Promise.all(flightsPromises);
  });

  await Promise.all(routesPromises);

  if (typeof response._next === 'string') {
    await getSubscriptionData(airportEndPoints, fetchId, offset + ROUTES_LIMIT);
  }
}

async function getAirportIfNotExists (IATACode) {
  const airports = await selectWhere('airports', ['id'], {
    iata_code: IATACode,
  });

  assertApp(
    Array.isArray(airports),
    'Invalid database airport response.'
  );

  if (airports.length > 0) {
    assertApp(
      airports.length === 1 &&
      Number.isInteger(airports[0].id),
      'Invalid database airport response.'
    );

    return airports[0].id;
  } else {
    const response = await requestJSON('https://api.skypicker.com/locations', {
      term: IATACode,
      locale: 'en-US',
      location_types: 'airport',
      limit: 1,
    });

    assertPeer(
      isObject(response) &&
      Array.isArray(response.locations) &&
      response.locations.length === 1 &&
      isObject(response.locations[0]) &&
      typeof response.locations[0].code === 'string' &&
      typeof response.locations[0].name === 'string' &&
      'API sent invalid airport data response.'
    );

    const airportId = await insert('airports', {
      iata_code: response.locations[0].code,
      name: `${response.locations[0].name}, ${response.locations[0].code}`,
    });

    return airportId;
  }
}

start();

const SERVER_TIME_FORMAT = 'Y-MM-DDTHH:mm:ssZ';
const { assertPeer, assertApp, PeerError } = require('../modules/error-handling');
const { toSmallestCurrencyUnit, fromSmallestCurrencyUnit } = require('../modules/utils');
const { isFunction, isObject, each, forOwn } = require('lodash');
const { log } = require('../modules/utils.js');
const moment = require('moment');

function search () {
  const execute = async function execute (params, db) {
    const dbToAPIRouteFlight = function dbToAPIRouteFlight (routeFlight) {
      assertApp(
        typeof routeFlight.airlineName === 'string' &&
        typeof routeFlight.logoURL === 'string' &&
        typeof routeFlight.afromName === 'string' &&
        typeof routeFlight.atoName === 'string' &&
        typeof routeFlight.dtime === 'string' &&
        typeof routeFlight.atime === 'string' &&
        typeof routeFlight.flightNumber === 'string' &&
        (routeFlight.isReturn === 1 || routeFlight.isReturn === 0),
        'Invalid database flight response.'
      );

      return {
        airport_from: routeFlight.afromName,
        airport_to: routeFlight.atoName,
        return: !!routeFlight.isReturn,
        dtime: routeFlight.dtime,
        atime: routeFlight.atime,
        airline_logo: routeFlight.logoURL,
        airline_name: routeFlight.airlineName,
        flight_number: routeFlight.flightNumber,
      };
    };

    const flyDurationCalc = (acc, flight) => {
      const arrivalTime = moment(flight.atime, SERVER_TIME_FORMAT);
      const departureTime = moment(flight.dtime, SERVER_TIME_FORMAT);

      return acc + arrivalTime.diff(departureTime, 'hours');
    };

    const flyDurationIncluder = (route) => {
      const accInitValue = 0;
      const flyDuration = route.route.reduce(flyDurationCalc, accInitValue);

      return { route, flyDuration };
    };

    const flyDurationFilter = (route) => {
      return (
        !params.max_fly_duration ||
        route.flyDuration <= params.max_fly_duration
      );
    };

    const flyDurationExcluder = (route) => {
      return { ...route.route };
    };

    const cmpPrices = function cmpPrices (route1, route2) {
      if (route1.price > route2.price) {
        return 1;
      } else if (route1.price < route2.price) {
        return -1;
      }
      return 0;
    };

    const cmpDepartureTimes = function cmpDepartureTimes (flight1, flight2) {
      const departureTime1 = moment(flight1.dtime, SERVER_TIME_FORMAT);
      const departureTime2 = moment(flight2.dtime, SERVER_TIME_FORMAT);

      if (departureTime1.isAfter(departureTime2)) {
        return 1;
      } else if (departureTime2.isAfter(departureTime1)) {
        return -1;
      }
      return 0;
    };

    const flightsInRouteSorter = function flightsInRouteSorter (route) {
      // sorts flights in a route by departure time
      return {
        ...route,
        route: route.route.sort(cmpDepartureTimes),
      };
    };

    const hasMatchingDepartureAirport = (flight) => {
      return flight.afromId === +params.fly_from;
    };

    const hasMatchingArrivalAirport = (flight) => {
      return flight.atoId === +params.fly_to;
    };

    const areEndpointsCorrect = (route) => {
      return route.some(hasMatchingDepartureAirport) &&
        route.some(hasMatchingArrivalAirport);
    };

    assertPeer(
      isObject(params) &&
      typeof params.v === 'string' &&
      Number.isInteger(+params.fly_from) &&
      Number.isInteger(+params.fly_to) &&
      (!params.price_to || Number.isInteger(params.price_to)) &&
      (!params.currency || typeof params.currency === 'string') &&
      (!params.date_from || typeof params.date_from === 'string') &&
      (!params.date_to || typeof params.date_to === 'string') &&
      (!params.sort || typeof params.sort === 'string') &&
      (!params.max_fly_duration || Number.isInteger(params.max_fly_duration)),
      'Invalid search request.'
    );

    params.price_to = toSmallestCurrencyUnit(params.price_to);

    const result = {};

    if (params.currency) {
      result.currency = params.currency;
    }

    const subs = await db.selectSubscriptions(+params.fly_from, +params.fly_to);

    if (subs <= 0) {
      await subscribe({
        v: params.v,
        fly_from: params.fly_from,
        fly_to: params.fly_to,
      }, db);

      result.status_code = 2000;
      result.routes = [];

      return result;
    }

    assertApp(
      subs.length === 1 &&
      isObject(subs[0]) &&
      Number.isInteger(subs[0].fetchId) &&
      typeof subs[0].timestamp === 'string',
      'Invalid subscription data.'
    );

    const fetchId = subs[0].fetchId;
    const routesAndFlights = await db.selectRoutesFlights(fetchId, params);

    assertApp(
      Array.isArray(routesAndFlights),
      'Invalid database routes and flights response.'
    );

    const routesHash = {};

    each(routesAndFlights, (routeFlight) => {
      assertApp(
        isObject(routeFlight) &&
        Number.isInteger(routeFlight.routeId) &&
        typeof routeFlight.bookingToken === 'string' &&
        Number.isInteger(routeFlight.price),
        'Invalid database route response.'
      );

      routesHash[routeFlight.routeId] = routesHash[routeFlight.routeId] || {
        booking_token: routeFlight.bookingToken,
        price: fromSmallestCurrencyUnit(routeFlight.price),
        route: [],
      };

      assertApp(Array.isArray(routesHash[routeFlight.routeId].route));

      routesHash[routeFlight.routeId].route.push(routeFlight);
    });

    const routes = [];

    forOwn(routesHash, (routeData, routeId) => {
      assertApp(
        typeof routeId === 'string' &&
        isObject(routeData),
        'Invalid database route response'
      );

      const route = routeData.route;

      assertApp(
        route.every(flight => {
          return Number.isInteger(flight.afromId) &&
            Number.isInteger(flight.atoId) &&
            typeof flight.airlineName === 'string' &&
            typeof flight.logoURL === 'string' &&
            typeof flight.afromName === 'string' &&
            typeof flight.atoName === 'string' &&
            typeof flight.dtime === 'string' &&
            typeof flight.atime === 'string' &&
            typeof flight.flightNumber === 'string' &&
            (flight.isReturn === 1 || flight.isReturn === 0);
        }),
        'Invalid database flight response.'
      );

      if (areEndpointsCorrect(route)) {
        const routeAPIFormat = route.map((flight) => {
          return dbToAPIRouteFlight(flight);
        });
        routes.push({
          ...routeData,
          route: routeAPIFormat,
        });
      }
    });

    const routesFiltered = routes
      .map(flyDurationIncluder)
      .filter(flyDurationFilter)
      .map(flyDurationExcluder)
      .sort(cmpPrices)
      .map(flightsInRouteSorter);

    result.routes = routesFiltered;
    result.status_code = 1000;

    return result;
  };

  return {
    name: 'search',
    execute,
  };
}

function subscribe (params, db) {
  const execute = async function execute (params, db) {
    assertPeer(
      isObject(params) &&
      Number.isInteger(+params.v) &&
      Number.isInteger(+params.fly_from) &&
      Number.isInteger(+params.fly_to),
      'Invalid subscribe request.'
    );

    const flyFrom = +params.fly_from;
    const flyTo = +params.fly_to;

    const isInserted = await db.insertIfNotExistsSub(flyFrom, flyTo);

    return {
      status_code: (isInserted) ? 1000 : 2000,
    };
  };

  return {
    name: 'subscribe',
    execute,
  };
}

function unsubscribe () {
  const execute = async function execute (params, db) {
    assertPeer(
      isObject(params) &&
      Number.isInteger(+params.v) &&
      Number.isInteger(+params.fly_from) &&
      Number.isInteger(+params.fly_to),
      'Invalid unsubscribe request.'
    );

    const isDel = await db.delIfNotExistsSub(+params.fly_from, +params.fly_to);

    return {
      status_code: (isDel) ? 1000 : 2000,
    };
  };

  return {
    name: 'unsubscribe',
    execute: execute,
  };
}

function sendError () {
  const execute = async function execute (params, db) {
    assertPeer(
      isObject(params),
      'Invalid senderror request',
    );

    log(params);

    return {
      status_code: 1000,
    };
  };

  return {
    name: 'senderror',
    execute: execute,
  };
}

function defineMethods (...args) {
  assertApp(
    args.every(isFunction),
    'defineMethods received an argument that is not a function.'
  );
  const methods = args.map((arg) => arg());

  const execute = (methods) => (methodName, params, db) => {
    assertPeer(
      typeof methodName === 'string',
      `Expected a name of method, got ${methodName}, type ${typeof methodName}`
    );

    assertPeer(
      isObject(params),
      `Expected object params, got ${params}, not an object`
    );

    assertPeer(
      isObject(db),
      `Expected db object, got ${db}`
    );

    for (const method of methods) {
      if (method.name === methodName) {
        return method.execute(params, db);
      }
    }
    throw new PeerError(`Unknown method '${methodName}'`);
  };

  return execute(methods);
}

module.exports = {
  defineMethods,
  search,
  subscribe,
  unsubscribe,
  sendError,
};

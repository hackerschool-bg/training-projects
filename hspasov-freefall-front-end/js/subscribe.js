function start () {
  const mainUtils = main();
  const ApplicationError = mainUtils.ApplicationError;
  const PeerError = mainUtils.PeerError;
  const assertApp = mainUtils.assertApp;
  const assertPeer = mainUtils.assertPeer;
  const assertUser = mainUtils.assertUser;
  const trace = mainUtils.trace;
  const sendRequest = mainUtils.sendRequest;
  const displayUserMessage = mainUtils.displayUserMessage;
  const SERVER_URL = mainUtils.SERVER_URL;
  const listAirports = mainUtils.listAirports;
  const validateErrorRes = validators.getValidateErrorRes();
  const validateSubscriptionRes = validators.getValidateSubscriptionRes();
  const validateSubscriptionReq = validators.getValidateSubscriptionReq();

  var airports = []; // eslint-disable-line no-var

  const $subscribeForm = $('#subscribe-form');
  const $subscribeBtn = $('#subscribe-button');

  function getAirport (term, airports) {
    assertApp(typeof term === 'string', {
      msg: 'Expected arg. term in getAirport to be a string, but got ' + typeof term, // eslint-disable-line prefer-template
    });
    assertApp(airports instanceof Array, {
      msg: 'Expected arg. airport in getAirport to be an array, but got ' + typeof airports, // eslint-disable-line prefer-template
    });

    var i; // eslint-disable-line no-var

    for (i = 0; i < airports.length; i++) {
      assertApp(_.isObject(airports[i]), 'Expected airports[' + i + '] to be an object, but got ' + typeof airports[i]); // eslint-disable-line prefer-template

      for (var prop in airports[i]) { // eslint-disable-line no-var
        if (
          airports[i].hasOwnProperty(prop) &&
          airports[i][prop].toLowerCase().indexOf(term.toLowerCase()) !== -1
        ) {
          assertApp(typeof airports[i].id === 'string', {
            msg: 'Airport object found does not have a property "id"',
          });
          assertApp(typeof airports[i].iata_code === 'string', {
            msg: 'Airport object found does not have a property "iata_code"',
          });
          assertApp(typeof airports[i].name === 'string', {
            msg: 'Airport object found does not have a property "name"',
          });

          return airports[i];
        }
      }
    }

    return null;
  }

  function subscribe (params, protocolName, callback) {
    trace('subscribe(' + JSON.stringify(params) + '), typeof arg=' + typeof params + ''); // eslint-disable-line prefer-template

    assertApp(validateSubscriptionReq(params), {
      msg: 'Params do not adhere to subscriptionRequestSchema',
    });

    const airportFrom = getAirport(params.fly_from, airports);
    const airportTo = getAirport(params.fly_to, airports);

    assertApp(_.isObject(airportFrom), {
      msg: 'Could not find airport "' + params.fly_from + '"', // eslint-disable-line prefer-template
    });
    assertApp(_.isObject(airportTo), {
      msg: 'Could not find airport "' + params.fly_to + '"', // eslint-disable-line prefer-template
    });

    sendRequest({
      url: SERVER_URL,
      data: {
        method: 'subscribe',
        params: params,
      },
      protocolName: protocolName,
    }, function (result, error) { // eslint-disable-line prefer-arrow-callback
      if (error) {
        assertPeer(validateErrorRes(error), {
          msg: 'Params do not adhere to errorResponseSchema',
        });

        trace('Error in subscribe:' + JSON.stringify(error)); // eslint-disable-line prefer-template
        throw new PeerError({
          msg: error.message,
        });
      }

      assertPeer(validateSubscriptionRes(result), {
        msg: 'Params do not adhere to subscriptionResponseSchema',
      });
      assertUser(result.status_code >= 1000 && result.status_code < 2000, {
        userMessage: 'Already subscribed for flights from ' + airportFrom.name + ' to ' + airportTo.name + '.', // eslint-disable-line prefer-template
        msg: 'Tried to subscribe but subscription already existed. Sent params: ' + params + '. Got result: ' + result + '', // eslint-disable-line prefer-template
      });

      callback(result);
    });
  }

  $(document).ready(function () { // eslint-disable-line prefer-arrow-callback
    $subscribeBtn.click(function (e) { // eslint-disable-line prefer-arrow-callback
      e.preventDefault();
      trace('Subscribe button clicked');

      $subscribeBtn.prop('disabled', true);

      const formParams = $subscribeForm
        .serializeArray()
        .reduce(function (acc, current) { // eslint-disable-line prefer-arrow-callback
          assertApp(_.isObject(current), 'Form parameter "' + current + '" not an object'); // eslint-disable-line prefer-template
          assertApp(typeof current.name === 'string', 'Expected name of form parameter to be string, but got ' + typeof current.name + ', name = ' + current.name + ''); // eslint-disable-line prefer-template
          assertApp(typeof current.value === 'string', 'Expected value of form parameter to be string, but got ' + typeof current.value + ', value = ' + current.value + ''); // eslint-disable-line prefer-template

          if (current.value.length <= 0) {
            return acc;
          }

          if (current.name === 'email') {
            acc.email = current.value;
          } else if (current.name === 'from') {
            const airportFrom = getAirport(params.fly_from, airports);
            assertUser(_.airportFrom(airportFrom), 'Could not find airport "' + params.fly_from + '"'); // eslint-disable-line prefer-template
            acc.fly_from = airportFrom.id;
          } else if (current.name === 'to') {
            const airportTo = getAirport(params.fly_to, airports);
            assertApp(_.isObject(airportTo), 'Could not find airport "' + params.fly_to + '"'); // eslint-disable-line prefer-template
            acc.fly_to = airportTo.id;
          } else if (current.name === 'date-from') {
            acc.date_from = current.value;
          } else if (current.name === 'date-to') {
            acc.date_to = current.value;
          } else {
            throw new ApplicationError({
              msg: 'Invalid subscribe form param "' + current.name + '"', // eslint-disable-line prefer-template
            });
          }

          return acc;
        }, {});

      const params = formParams;
      params.v = '2.0';

      subscribe(params, 'jsonrpc', function (result) { // eslint-disable-line prefer-arrow-callback
        if (result.status_code >= 1000 && result.status_code < 2000) {
          displayUserMessage('Successfully subscribed!', 'success');
        } else if (result.status_code === 2000) {
          displayUserMessage('There is no information about this flight at the moment. Please come back in 15 minutes.', 'info');
        }

        $subscribeBtn.prop('disabled', false);
      });
    });

    listAirports('jsonrpc', function (result) { // eslint-disable-line prefer-arrow-callback
      airports = result.airports;

      const airportNames = airports.map(function (airport) { // eslint-disable-line prefer-arrow-callback
        return airport.name;
      });

      $('#from-input').autocomplete(airportNames);
      $('#to-input').autocomplete(airportNames);
    });

    const datepickerOptions = {
      dateFormat: 'yy-mm-dd',
    };

    $('#date-from').datepicker(datepickerOptions);
    $('#date-to').datepicker(datepickerOptions);
  });
}

start();

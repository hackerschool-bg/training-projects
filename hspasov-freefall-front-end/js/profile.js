'use strict';

function start () {
  const mainUtils = main();
  const listAirports = mainUtils.listAirports;

  var airports = []; // eslint-disable-line no-var

  $(document).ready(function () { // eslint-disable-line prefer-arrow-callback
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

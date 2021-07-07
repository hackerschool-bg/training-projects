<?php
/**
*Plugin Name: Google maps API task
**/
  global $wpdb;
  $locations = $wpdb->get_results('SELECT address, elevation, elevation_unit, data_coverage, min_date, max_date, lat, lng FROM locations;');

  function gmaps_api_task()
  {
    global $locations;
    $content = '<html><head>
    <style>
      .wrap {
        width: 100%;
        padding-left: 0;
        padding-right: 0;
        max-width: none;
      }
      .entry-header {
        display: none;
      }
      #primary {
        max-width: none !important;
      }
      #content {
        padding: 0;
      }
      #filter-options {
        max-width: 750px;
        margin-left: auto;
        margin-right: auto;
      }
    </style>
    </head>
    <body>
    <div>
      <div id="map" style="height: 400px; width: 100%;"></div>
      <div id="filter-options">
        <div>
          <button id="submit_filter" onclick="submitFilter()">Submit filter</button>
          <button id="reset_filter" onclick="resetFilter()">Reset filter</button>
        </div>
        <div>
          <label>Elevation:</label>
          <label for="from_elevation">From</label>
          <input id="from_elevation" type="number" step="0.1">
          <label for="to_elevation">To</label>
          <input id="to_elevation" type="number" step="0.1">
          <hr>
        </div>
        <div>
          <label>Coverage:</label>
          <label for="from_data_coverage">From</label>
          <input id="from_data_coverage" type="number" step="0.0001">
          <label for="to_data_coverage">To</label>
          <input id="to_data_coverage" type="number" step="0.0001">
          <hr>
        </div>
        <div>
          <label>Data between:</label>
          <label for="from_date">From</label>
          <input id="from_date" type="date" step="0.0001">
          <label for="to_date">To</label>
          <input id="to_date" type="date" step="0.0001">
          <hr>
        </div>
        <div>
          <label>Coordinates:</label>
          <div>
            <label>Latitude:</label>
            <label for="from_lat">From</label>
            <input id="from_lat" type="number" step="0.00001">
            <label for="to_lat">To</label>
            <input id="to_lat" type="number" step="0.00001">
          </div>
          <div>
            <label>Longitude:</label>
            <label for="from_lng">From</label>
            <input id="from_lng" type="number" step="0.00001">
            <label for="to_lng">To</label>
            <input id="to_lng" type="number" step="0.00001">
          </div>
          <hr>
        </div>
      </div>
    </div>
    </body>
    </html>';
  ?>
  <script>
    <?php echo 'var locations = '.json_encode($locations).';';?>;

    var map = null;
    var markers = [];

    function makeRequest(url) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open('GET', url);
      xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
          locations = JSON.parse(xmlhttp.responseText);
          clearMarkers();
          initMap();
        }
      }
      xmlhttp.send();
    }

    function parseInputFloat(input) {
      if (!input.value) {
        return null;
      } else {
        return parseFloat(input.value);
      }
    }

    function parseInputDate(input) {
      if (!input.value) {
        return null;
      } else {
        return input.value;
      }
    }

    function submitFilter() {
      var fromElevationInput = document.getElementById('from_elevation');
      var toElevationInput = document.getElementById('to_elevation');
      var fromDataCoverageInput = document.getElementById('from_data_coverage');
      var toDataCoverageInput = document.getElementById('to_data_coverage');
      var fromDateInput = document.getElementById('from_date');
      var toDateInput = document.getElementById('to_date');
      var fromLatInput = document.getElementById('from_lat');
      var toLatInput = document.getElementById('to_lat');
      var fromLngInput = document.getElementById('from_lng');
      var toLngInput = document.getElementById('to_lng');

      if (!(
        fromElevationInput &&
        toElevationInput &&
        fromDataCoverageInput &&
        toDataCoverageInput &&
        fromDateInput &&
        toDateInput &&
        fromLatInput &&
        toLatInput &&
        fromLngInput &&
        toLngInput
       )) {
        console.log('Error: invalid submit format');
        return;
      }

      var elevationFrom = parseInputFloat(fromElevationInput);
      var elevationTo = parseInputFloat(toElevationInput);
      var dataCoverageFrom = parseInputFloat(fromDataCoverageInput);
      var dataCoverageTo = parseInputFloat(toDataCoverageInput);
      var dataFrom = parseInputDate(fromDateInput);
      var dataTo = parseInputDate(toDateInput);
      var latFrom = parseInputFloat(fromLatInput);
      var latTo = parseInputFloat(toLatInput);
      var lngFrom = parseInputFloat(fromLngInput);
      var lngTo = parseInputFloat(toLngInput);
      
      makeRequest('../../filter-locations.php?filter=true' + 
        (elevationFrom === null? '' : ('&elevation_from=' + encodeURIComponent(elevationFrom))) +
        (elevationTo === null? '' : ('&elevation_to=' + encodeURIComponent(elevationTo))) +
        (dataCoverageFrom === null? '' : ('&data_coverage_from=' + encodeURIComponent(dataCoverageFrom))) +
        (dataCoverageTo === null? '' : ('&data_coverage_to=' + encodeURIComponent(dataCoverageTo))) +
        (dataFrom === null? '' : ('&data_from=' + encodeURIComponent(dataFrom))) +
        (dataTo === null? '' : ('&data_to=' + encodeURIComponent(dataTo))) +
        (latFrom === null? '' : ('&lat_from=' + encodeURIComponent(latFrom))) +
        (latTo === null? '' : ('&lat_to=' + encodeURIComponent(latTo))) +
        (lngFrom === null? '' : ('&lng_from=' + encodeURIComponent(lngFrom))) +
        (lngTo === null? '' : ('&lng_to=' + encodeURIComponent(lngTo)))
      );
    }

    function resetFilter() {
      document.getElementById('from_elevation').value = '';
      document.getElementById('to_elevation').value = '';
      document.getElementById('from_data_coverage').value = '';
      document.getElementById('to_data_coverage').value = '';
      document.getElementById('from_date').value = '';
      document.getElementById('to_date').value = '';
      document.getElementById('from_lat').value = '';
      document.getElementById('to_lat').value = '';
      document.getElementById('from_lng').value = '';
      document.getElementById('to_lng').value = '';
      clearMarkers();
      makeRequest('../../filter-locations.php'); // no filtering
    }

    function clearMarkers() {
      markers.forEach(marker => {
        marker.setMap(null);
      });
      markers.length = 0;
    }

    function initMap() {
      var usa = {lat: 37.275, lng: -95.655};
      
      markers.length = 0;
      
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: usa
      });
      
      locations.forEach(location => {
        var infoWindow = new google.maps.InfoWindow({ 
          content: `address: ${location.address},
            elevation: ${location.elevation},
            elevation_unit: ${location.elevation_unit},
            data_coverage: ${location.data_coverage},
            min_date: ${location.min_date},
            max_date: ${location.max_date},
            lat: ${location.lat},
            lng: ${location.lng}` 
        });
        var marker = new google.maps.Marker({
          position: {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng)
          },
          map: map
        });
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markers.push(marker);
      });
    }
  </script>
  <script async defer
    src='https://maps.googleapis.com/maps/api/js?key=AIzaSyA9HxwNfmUEyBe1F2NV72n2PJRxy81ss9Q&callback=initMap'>
  </script>
  <?php
    return $content;
  }
  add_shortcode('gmapsapitask', 'gmaps_api_task');
?>

function filter_form() {
    return document.getElementById('filter_form');
}


function urlParams() {
    const pairs = window.location.search.slice(1).split('&').map(
        function (param) {
            const pair = param.split('=');
            return {"name": decodeURIComponent(pair[0]), "value": decodeURIComponent(pair[1])};
        });
    return pairs.reduce((map, pair) => {
        map[pair.name] = pair.value;
        return map
    }, {});
}

function fillInputs() {
    const form = filter_form();
    const params = urlParams();
    for (const name in params) {
        if (params.hasOwnProperty(name) && form[name]) {
            form[name].value = params[name];
        }
    }
}

// function setupFiltering(markerDataObject, markerClustererObject) {
//     function filterLocation(location, minLat, maxLat, minLng, maxLng) {
//         return (minLat < location.lat && location.lat < maxLat &&
//             minLng < location.lng && location.lng < maxLng);
//     }
//
//     function filterData(markerData, minLat, maxLat, minLng, maxLng) {
//         markerData.filtered = markerData.data.map(loc => filterLocation(loc, minLat, maxLat, minLng, maxLng));
//         return markerData.filtered
//     }
//
//     function filterMarkers(markerData, clusterer) {
//         clusterer.clearMarkers();
//         for (k = 0; k < markerData.data.length; k++) {
//             if (markerData.filtered[k]) {
//                 clusterer.addMarker(markerData.markers[k]);
//             }
//         }
//         clusterer.redraw()
//     }
//
//     function watchForm(form, eventHandler) {
//
//     }
//
//     setInterval(
//         function () {
//             let form = filter_form();
//             filterData(markerDataObject, 0, form.lat.value, 0, 100);
//             filterMarkers(markerDataObject, markerClustererObject);
//         },
//         1000);
// }

function parseCoordinates(string) {
    let markerCoordinates = [];
    let data_markers = string.split(' ');

    for (let k = 0; k < data_markers.length - 5; k += 5) {
        let name = data_markers[k];
        let lat = parseFloat(data_markers[k + 1]);
        let lng = parseFloat(data_markers[k + 2]);
        let population = data_markers[k + 3];
        let elevation = data_markers[k + 4];
        markerCoordinates.push({
            'name': decodeURIComponent(name),
            'lat': lat,
            'lng': lng,
            'pop': population,
            'ele': elevation
        });
    }
    return markerCoordinates;
}

function prepareMarkers() {
    let coords = parseCoordinates(
        document.getElementById("map").getAttribute('data-markers'));
    let filtered = Array(coords.length).fill(true);
    let markers = coords.map(coord => new google.maps.Marker({
        position: new google.maps.LatLng(coord.lat, coord.lng),
        label: coord.name
    }));
    return {
        "data": coords, "filtered": filtered, "markers": markers
    };
}

function infoWindowString(data) {
    return data.name
        + '<br>population: ' + data.pop
        + "<br>lat: " + data.lat + " lng: " + data.lng
        + "<br>elevation: " + data.ele;
}

function makeInfoWindowEvent(map, infoWindow, contentString, marker) {
    google.maps.event.addListener(marker, 'click', function () {
        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);
    });
}

function findCenter(markerData) {
    if (markerData === undefined || markerData.length === 0) {
        return new google.maps.LatLng(0, 0);
    }
    else {
        return new google.maps.LatLng(markerData[0].lat, markerData[0].lng);
    }
}

function drawBounds(map) {
    let params = urlParams();
    let polys = [];
    latmin_line = [new google.maps.LatLng(params['latmin'], 0),
                   new google.maps.LatLng(params['latmin'], 80)];
    latmax_line = [new google.maps.LatLng(params['latmax'], 0),
                   new google.maps.LatLng(params['latmax'], 80)];
    lngmin_line = [new google.maps.LatLng(0, params['lngmin']),
                   new google.maps.LatLng(80, params['lngmin'])];
    lngmax_line = [new google.maps.LatLng(0, params['lngmax']),
                   new google.maps.LatLng(80, params['lngmax'])];
    if(!params['latmin']) {
        polys.push(latmin_line)
    }
    if(!params['latmax']) {
        polys.push(latmax_line)
    }
    if(!params['lngmin']) {
        polys.push(lngmin_line)
    }
    if(!params['lngmax']) {
        polys.push(lngmax_line)
    }
    polys.forEach(poly => {
        let path = new google.maps.Polyline({
            path: poly,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        path.setMap(map);
    });
}
function rectanglePolyCords() {
    let params = urlParams();
    params['latmin'] = params['latmin'] ? params['latmin'] : -80;
    params['latmax'] = params['latmax'] ? params['latmax'] : 80;
    params['lngmin'] = params['lngmin'] ? params['lngmin'] : -80;
    params['lngmax'] = params['lngmax'] ? params['lngmax'] : 80;
    return [
        new google.maps.LatLng(params['latmin'], params['lngmin']),
        new google.maps.LatLng(params['latmax'], params['lngmin']),
        new google.maps.LatLng(params['latmax'], params['lngmax']),
        new google.maps.LatLng(params['latmin'], params['lngmax']),
        new google.maps.LatLng(params['latmin'], params['lngmin'])
    ];}

function initMap() {
    let mapCanvas = document.getElementById("map");
    let infoWindow = new google.maps.InfoWindow({
        content: " "
    });
    const markerData = prepareMarkers();
    const mapElement = new google.maps.Map(mapCanvas,
        {center: findCenter(markerData.data), zoom: 12});
    const markerCluster = new MarkerClusterer(mapElement, markerData.markers,
        {
            imagePath: "https://raw.githubusercontent.com/googlemaps/v3-utility-library/master/markerclustererplus/images/m",
            maxZoom: 14
        });
    for (let k = 0; k < markerData.markers.length; k++) {
        let data = markerData.data[k];
        let marker = markerData.markers[k];
        makeInfoWindowEvent(mapElement, infoWindow, infoWindowString(data), marker);
    }
    let flightPath = new google.maps.Polyline({
        path: rectanglePolyCords(),
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    flightPath.setMap(mapElement);
    //drawBounds(mapElement);
}

function google_map() {
    fillInputs();
}

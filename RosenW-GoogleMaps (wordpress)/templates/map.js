function showMarker(lat, lng, name){
    var marker = new google.maps.Marker({
    	position: {lat: lat,lng: lng},
    	map: map
    });

    filteredPlaces.push(name);
    markers.push(marker);
    markerCount++;
}

function clearAllMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    markerCount = 0;

    showMarkerCount();
}

function showMarkerIfInRange(lat, lng) {
    let fromCoords = fromBox.val().split(", ");
    let toCoords = toBox.val().split(", ");

    if (lat > fromCoords[0] &&
        lng > fromCoords[1] &&
        lat < toCoords[0] &&
        lng < toCoords[1]) {
        let curMarker = new google.maps.Marker({
            position: {
                lat: lat,
                lng: lng
            },
            map: map
        });
        markers.push(curMarker);
        markerCount++;
    }
}


function pushNamesToFilteredPlaces(lat, lng, name) {
    let fromCoords = fromBox.val().split(", ");
    let toCoords = toBox.val().split(", ");

    if (
        lat > fromCoords[0] &&
        lng > fromCoords[1] &&
        lat < toCoords[0] &&
        lng < toCoords[1]) {
        filteredPlaces.push(name);
    }
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function showMarkerCount() {
    $("#count").text("Markers on map: " + markerCount);
}

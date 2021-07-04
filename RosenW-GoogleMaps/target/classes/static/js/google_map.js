$(function() {
    //let searchAreaButton = $("#searchAreaBtn").click(searchArea);
    //let searchButton = $("#searchBtn").click(search);
    //let findBtn = $("#findBtn").click(find); Deprecated
    $('#submitBtn').click(submit);
    $('#showAllBtn').click(showAllMarkers);
    $('#hideAllBtn').click(clearAllMarkers);

    fromBox = $('#from').change(changePlaces);
    toBox = $('#to').change(changePlaces);


    $.ui.autocomplete.filter = function(array, term) {
        var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(term), "i");
        return $.grep(array, function(value) {
            return matcher.test(value.label || value.value || value);
        });
    };

    $(".autocomplete").autocomplete({
        minLength: 3,
        delay: 700,
        source: function(request, response) {
                        let results = $.ui.autocomplete.filter(filteredPlaces, request.term);
                        response(results);
                    }
    });

    $.get("/types/all").done(function(data) {
        let types = data;
        types.forEach((element) => {
            let curType;
            let $label = $("<label>", {
                for: element.id
            });
            let $checkbox = $("<input>", {
                type: "checkbox",
                id: element.id
            });
            let $span = $("<span>" + element.name + "</span>");
            $label.append($checkbox);
            $label.append($span);
            $('#checkboxes').append($label);
        });
    });

});

let bulgariaCoords = {
    lat: 42.7,
    lng: 25.4
};
let markerCount = 0;
let map;
let expanded = false;
let markers = [];
let filteredPlaces = [];
let fromBox;
let toBox;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: bulgariaCoords,
        zoom: 6
    });

    showAllMarkers();
}

function searchArea() {
    clearAllMarkers();
    let latFrom = $("#latFrom").val();
    let latTo = $("#latTo").val();
    let lngFrom = $("#lngFrom").val();
    let lngTo = $("#lngTo").val();

    $.get("/markers/" + latFrom + "/" + latTo + "/" + lngFrom + "/" + lngTo).done(function(selectedMarkers) {
        selectedMarkers.forEach((element) => {
            let curMarker = new google.maps.Marker({
                position: {
                    lat: element.lat,
                    lng: element.lng
                },
                map: map
            });
            markers.push(curMarker);
            markerCount++;
        });
        showMarkerCount();
    });
}

function clearAllMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    markerCount = 0;
}

function showCheckboxes() {
    let checkboxes = document.getElementById("checkboxes");
    checkboxes.addEventListener( 'change', function() {
                   changePlaces();
               });
    if (!expanded) {
        checkboxes.style.display = "block";
        expanded = true;
    } else {
        checkboxes.style.display = "none";
        expanded = false;
    }
}

function search() {
    clearAllMarkers();
    let selectedValues = [];

    $("input:checkbox").each(function() {
        let $this = $(this);
        if ($this.is(":checked")) {
            selectedValues.push($this.attr("id"));
        }
    });

    $.get("/markers/all").done(function(markerData) {
        $.get("/relations/all").done(function(relations) {
            let curSelectedMarkers = [];
            markerData.forEach((marker) => {
                selectedValues.forEach((val) => {
                    let markerIsOfType = false;
                    let markerAlreadySelected = false;

                    curSelectedMarkers.forEach((curSelectedMarker) => {
                        if (curSelectedMarker == marker.id) {
                            markerAlreadySelected = true;
                        }
                    });

                    relations[marker.id].forEach((markerType) => {
                        if (markerType == val) {
                            markerIsOfType = true;
                        }
                    });
                    if (markerIsOfType && !markerAlreadySelected) {
                        curSelectedMarkers.push(marker.id);
                        let curMarker = new google.maps.Marker({
                            position: {
                                lat: marker.lat,
                                lng: marker.lng
                            },
                            map: map
                        });
                        markers.push(curMarker);
                        markerCount++;
                    }
                });
            });
            showMarkerCount();
        });
    });
}

function find() {
    clearAllMarkers();
    $.get("/markers/all").done(function(allMarkers) {
        let nameToSearch = $("#findBox").val();
        console.log(nameToSearch);
        allMarkers.forEach((element) => {
            console.log(element.name);
            if (nameToSearch == element.name) {
                let curMarker = new google.maps.Marker({
                    position: {
                        lat: element.lat,
                        lng: element.lng
                    },
                    map: map
                });
                markers.push(curMarker);
                markerCount++;
            }
        });
        showMarkerCount();
    });
}

function showMarkerCount() {
    $("#count").text("Markers on map: " + markerCount);
}

function showAllMarkers() {
    $.get("/markers/all").done(function(data) {
        clearAllMarkers();
        let markerData = data;
        markerData.forEach((element) => {
            let curMarker = new google.maps.Marker({
                position: {
                    lat: element.lat,
                    lng: element.lng
                },
                map: map
            });
            markers.push(curMarker);
            markerCount++;
        });
        showMarkerCount();
    });
}

function submit() {
    clearAllMarkers();
    $.get("/markers/all").done(function(allMarkers) {
        let nameToSearch = $("#findBox").val();
        if (nameToSearch === "") {
            allMarkers.forEach((element) => {
                filteredPlaces.forEach((place) => {
                    if (element.name == place) {
                        let curMarker = new google.maps.Marker({
                            position: {
                                lat: element.lat,
                                lng: element.lng
                            },
                            map: map
                        });
                        markers.push(curMarker);
                        markerCount++;
                    }
                });
            });
        } else {
            allMarkers.forEach((element) => {
                if (nameToSearch == element.name) {
                    let curMarker = new google.maps.Marker({
                        position: {
                            lat: element.lat,
                            lng: element.lng
                        },
                        map: map
                    });
                    markers.push(curMarker);
                    markerCount++;
                }
            });
        }
        showMarkerCount();
    });
}

function changePlaces() {
    let fromCoords = fromBox.val().split(", ");
    let toCoords = toBox.val().split(", ");
    let selectedValues = [];

    if (fromCoords.length === 2 && toCoords.length === 2 && isNumber(fromCoords[0]) && isNumber(fromCoords[1]) && isNumber(toCoords[0]) && isNumber(toCoords[1])) {
        while (filteredPlaces.length > 0) {
            filteredPlaces.pop();
        }
        $.get("/markers/" + fromCoords[0] + "/" + toCoords[0] + "/" + fromCoords[1] + "/" + toCoords[1]).done(function(selectedMarkers) {
            $.get("/relations/all").done(function(relations) {
                $("input:checkbox").each(function() {
                    let $this = $(this);
                    if ($this.is(":checked")) {
                        selectedValues.push($this.attr("id"));
                    }
                });

                let curSelectedMarkers = [];
                selectedMarkers.forEach((marker) => {
                    selectedValues.forEach((val) => {
                        let markerIsOfType = false;
                        let markerAlreadySelected = false;

                        curSelectedMarkers.forEach((curSelectedMarker) => {
                            if (curSelectedMarker == marker.id) {
                                markerAlreadySelected = true;
                            }
                        });

                        relations[marker.id].forEach((markerType) => {
                            if (markerType == val) {
                                markerIsOfType = true;
                            }
                        });
                        if (markerIsOfType && !markerAlreadySelected) {
                            curSelectedMarkers.push(marker.id);
                            filteredPlaces.push(marker.name);
                        }
                    });
                });
            });
        });
    }
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
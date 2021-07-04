<?php

/* Template Name: Display data */

?>

<?php get_header();?>

<div>

<head>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<style>
#map {
        height: 400px;
        width: 100%;
}
.multiselect {
  width: 200px;
}

.selectBox {
  position: relative;
}

.selectBox select {
  width: 100%;
  font-weight: bold;
}

.overSelect {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}

#checkboxes {
  display: none;
  border: 1px #dadada solid;
}

#checkboxes label {
  display: block;
}

#checkboxes label:hover {
  background-color: #1e90ff;
}

ul {list-style: none}

   .ui-autocomplete {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    float: left;
    display: none;
    min-width: 160px;   
    padding: 4px 0;
    margin: 0 0 10px 25px;
    list-style: none;
    background-color: #ffffff;
    border-color: #ccc;
    border-color: rgba(0, 0, 0, 0.2);
    border-style: solid;
    border-width: 1px;
    -webkit-border-radius: 5px;
    -moz-border-radius: 5px;
    border-radius: 5px;
    -webkit-box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    -moz-box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    -webkit-background-clip: padding-box;
    -moz-background-clip: padding;
    background-clip: padding-box;
    *border-right-width: 2px;
    *border-bottom-width: 2px;
}

.ui-menu-item > a.ui-corner-all {
    display: block;
    padding: 3px 15px;
    clear: both;
    font-weight: normal;
    line-height: 18px;
    color: #555555;
    white-space: nowrap;
    text-decoration: none;
}

.ui-state-hover, .ui-state-active {
    color: #ffffff;
    text-decoration: none;
    background-color: #0088cc;
    border-radius: 0px;
    -webkit-border-radius: 0px;
    -moz-border-radius: 0px;
    background-image: none;
}
</style>
</head>

<div id="map"></div>

<form style="float: left">
    From:<br>
    <input type="text" id="from" placeholder="Lat, Long">
    <br>
    To:<br>
    <input type="text" id="to" placeholder="Lat, Long">
    <br>
    <button type="button" id="submitBtn">Search</button>
    <button type="button" id="showAllBtn">Show All</button>
    <button type="button" id="hideAllBtn">Hide All</button>
</form>

<form style="float: left">
    Find by name:<br>
    <input type="text" name="name" class="autocomplete" id="findBox">
    <br><br>
</form>

<div id="count"></div>

<script>

$(function() {
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
        minLength: 2,
        delay: 700,
        source: function(request, response) {
                        let results = $.ui.autocomplete.filter(filteredPlaces, request.term);
                        response(results);
                    }
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
<?php global $wpdb;?>

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: bulgariaCoords,
        zoom: 6
    });

    showAllMarkers();
    showMarkerCount();
}																																																	
																																																																																		
function showAllMarkers(){
    clearAllMarkers();
<?php
    $result = $wpdb->get_results("SELECT * FROM markers");?>
	let markerArray = <?php echo json_encode($result) ?>;
	markerArray.forEach((m)=>{
	    showMarker(Number(m.lat), Number(m.lng), m.name);
	});
    showMarkerCount();
}

function submit() {
    	clearAllMarkers();
	<?php $markers = $wpdb->get_results("SELECT * FROM markers");?>
        let nameToSearch = $("#findBox").val();
    	let markerArray = <?php echo json_encode($result) ?>;
        if (nameToSearch == "") {
		markerArray.forEach((m)=>{
			showMarkerIfInRange(Number(m.lat), Number(m.lng));
		});
        } else {
		markerArray.forEach((m)=>{
			if (nameToSearch == m.name) {
				showMarker(Number(m.lat), Number(m.lng));
		        }
		});
                
        }
        showMarkerCount();
}

function changePlaces() {
    let fromCoords = fromBox.val().split(", ");
    let toCoords = toBox.val().split(", ");

    if (fromCoords.length === 2 && toCoords.length === 2 && isNumber(fromCoords[0]) && isNumber(fromCoords[1]) && isNumber(toCoords[0]) && isNumber(toCoords[1])) {
        while (filteredPlaces.length > 0) {
            filteredPlaces.pop();
        }

	<?php
    $result = $wpdb->get_results("SELECT * FROM markers");?>
	let markerArray = <?php echo json_encode($result) ?>;

	markerArray.forEach((m)=>{
        	pushNamesToFilteredPlaces(Number(m.lat),Number(m.lng),m.name);
	});
    }
}

</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDWCr6tIiwBUyJvMSaEHkFHtSkRPDH8VmU&callback=initMap"></script>
</div>

<?php get_footer();?>

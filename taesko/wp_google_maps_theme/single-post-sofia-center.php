<?php
/**
 * The template for displaying all single posts
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post
 *
 * @package WordPress
 * @subpackage Twenty_Seventeen
 * @since 1.0
 * @version 1.0
 */

?>

<?php
function echo_from_txt() {
    $file_path = getcwd() . '/wp-content/themes/twentyseventeen/bg_locations.txt';
    $contents = file($file_path);
    foreach($contents as $line) {
        $columns = explode(",", $line);
        echo "{$columns[1]} {$columns[2]} ";
    }
}
function explode_range($str) {
    $data = explode(':', $str);
    if(count($data) == 1 && $data[0]) {
        return ["min" => $data[0], "max"=>100000000000];
    }
    else if(count($data) > 1) {
        return ["min" => $data[0], "max"=>$data[1]];
    }
    else {
        return ["min" => -100000000000, "max"=> 1000000000000];
    }
}
function get_param($param, $default) {
    $val = get_query_var($param, $default);
    if ($val == '') {
        $val = $default;
    }
    return $val;
}
function get_country_code() {
    $str = strtoupper(get_param("ccode", ".*"));
    $len = strlen($str);
    if ($len < 2) {
        return ".*";
    }
    else if($len == 2){
        return $str;
    }
    else {
        switch ($str) {
        case 'ROMANIA':
            return 'RO';
            break;
        case 'BULGARIA':
            return 'BG';
            break;
        default:
            return substr($str, 0, 2);
        }
    }
}

function echo_from_db() {
    global $wpdb;
    $query = $wpdb->prepare("
        SELECT name, latitude, longitude,population, elevation from wp_map_markers
        WHERE (latitude BETWEEN %f AND %f) 
        AND (longitude BETWEEN %f AND %f)
        AND (elevation BETWEEN %f and %f)
        AND (name REGEXP '%s')
        AND (population BETWEEN %d AND %d)
        AND (country_code REGEXP '%s')",
        get_param('latmin', -300), get_param('latmax', 300),
        get_param('lngmin', -300), get_param('lngmax', 300),
        get_param('elemin', -12000), get_param('elemax', 120000),
        get_param('loc_name', '.*'),
        get_param('popmin', 0), get_param('popmax', 9000000000),
        get_country_code()
    );
    $results = $wpdb->get_results($query, ARRAY_A);
    foreach($results as $result) {
        $name = str_replace("\"", '&quot;', $result['name']);
        $name = str_replace(' ', '%20', $name);
        $lat = $result['latitude'];
        $lng = $result['longitude'];
        $population = $result['population'];
        $elevation = $result['elevation'];
        echo "$name $lat $lng $population $elevation ";
    }
  
}
function echo_dm_cls() {
    echo "data-markers=\"";
    echo_from_db();
    echo "\"";
}
?>
<html <?php language_attributes(); ?> class="no-js no-svg">
    <head>
        <meta charset="<?php bloginfo( 'charset' ); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="profile" href="http://gmpg.org/xfn/11">

        <?php wp_head(); ?>
        <style>
            html, body {
                height: 100%;
                width: 100%;
                padding: 0;
                margin: 1em, 0, 0, 0;
            }
            body {
                display:flex;
            }
            #map {
                height: 100%;
                width: 100%;
            } 
            #filter_form {
                text-align: center;
                height: 100%;
                overflow: scroll;
            }
            .input_container {
                margin: 0 7px;
            }

            .range-fieldset label {
                display: block;
                text-align: initial;
            }
            .range-fieldset label>input {
                float: left;
            }
            #button_container {
                display: flex;
                text-align: center;
                justify-content: center;
            }
        </style>
    </head>
    <body>
        <form id='filter_form' method='get' novalidate>
            <div id='name_input_container' class='input_container'>
                <label for='loc_name'>Name:</label>
                <input type='text' name='loc_name'>
            </div>
            <div class='input_container'>
                <label for='ccode'>Country Code:</label>
                <input list='codes' name='ccode' value='Bulgaria'>
                <datalist id='codes'>
                    <option value="Bulgaria">
                    <option value="Romania">
                    <option value="BG">
                    <option value="RO">
                </datalist>
            </div>
            <div class='input_container'>
                <fieldset class='range-fieldset'>
                <legend>Population</legend>
                <div class='range_field_container'>
                    <label for='popmin'>Min:</label>
                    <input type='number' name='popmin' placeholder='0' step=1000>
                </div>
                <div class='range_field_container'>
                    <label for='popmax'>Max:</label>
                    <input type='number' name='popmax', placeholder='24183300' step=1000>
                </div>
            </div>
            <div class='input_container'>
                <fieldset class='range-fieldset'>
                <legend>Latitude</legend>
                <div class='range_field_container'>
                    <label for='latmin'>Min:</label>
                    <input type='number' name='latmin' placeholder='-90'>
                </div>
                <div class='range_field_container'>
                    <label for='latmax'>Max:</label>
                    <input type='number' name='latmax' placeholder='+90'>
                </div>
            </div>
            <div class='input_container'>
                <fieldset class='range-fieldset'>
                <legend>Longitude</legend>
                <div class='range_field_container'>
                    <label for='lngmin'>Min:</label>
                    <input type='number' name='lngmin' placeholder='-180'>
                </div>
                <div class='range_field_container'>
                    <label for='lngmax'>Max:</label>
                    <input type='number' name='lngmax' placeholder='+180'>
                </div>
            </div>
            <div class='input_container'>
                <fieldset class='range-fieldset'>
                <legend>Elevation</legend>
                <div class='range_field_container'>
                    <label for='elemin'>Min:</label>
                    <input type='number' name='elemin' placeholder='-10971' step=50>
                </div>
                <div class='range_field_container'>
                    <label for='elemax'>Max:</label>
                    <input type='number' name='elemax' placeholder='8850' step=50>
                </div>
            </div>
            <div id='button_container' class='input_container'>
                <button id='submit_button' type="submit">Filter</button>
            </div>
        </form>
        <div id="map" <?php echo_dm_cls() ?> ></div>
    </body>
    <script type="text/javascript" src="https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js"></script>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDe8Gok8E-1JFGtCRm24aZBnbFstkP3fyA&callback=initMap"></script>
    <script type="text/javascript">google_map()</script>
</html>

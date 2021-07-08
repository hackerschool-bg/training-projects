#!/opt/lampp/bin/php
<?php
define('SHORTINIT', true);

require('/opt/lampp/apps/wordpress/htdocs/wp-load.php');

$COLUMNS = [
    'ascii_name' => 2,
    'latitude' => 4,
    'longtitude' => 5,
    'country_code' => 8,
    'population' => 14,
    'elevation' => 15
];
global $wpdb;
$file_path = $argv[1];
if (count($argv) > 2) {
    $action = $argv[2];
}
else {
    $action = 'insert';
}
$contents = file($file_path);
$values = array();
$place_holders = array();
$query = 'INSERT INTO wp_map_markers (name, latitude, longtitude, country_code, population) VALUES ';
foreach($contents as $line) {
    $raw_data = explode("\t", $line);
    for($k=1; $k<6; $k++) {
        $raw_data[$k] = trim($raw_data[$k]);
    }
    if($raw_data[$COLUMNS['population']] == '') {
        $raw_data[$COLUMNS['population']] = null;
        $pop_ph = "NULL";
    }
    else {
        $pop_ph = "%d";
    }
    array_push($values,
        $raw_data[$COLUMNS['ascii_name']],
        $raw_data[$COLUMNS['latitude']],
        $raw_data[$COLUMNS['longtitude']],
        $raw_data[$COLUMNS['country_code']],
        $raw_data[$COLUMNS['population']]
    );
    $place_holders[] = "(%s, %f, %f, %s, $pop_ph)";
}
$query .= implode(', ', $place_holders);
if($action == 'replace') {
    $wpdb->query('DELETE FROM wp_map_markers');
}
$wpdb->query($wpdb->prepare("$query ", $values));

<?php
  require('wp-load.php');

  global $wpdb;

  $query = 'SELECT address, elevation, elevation_unit, data_coverage, min_date, max_date, lat, lng 
  FROM locations WHERE';

  $query_parameters = array();

  if (isset($_GET['elevation_from'])) {
    $query .= ' elevation >= %f';
    array_push($query_parameters, $_GET['elevation_from']);
  } else {
    $query .= ' 1 = 1';
  }

  if (isset($_GET['elevation_to'])) {
    $query .= ' AND elevation <= %f';
    array_push($query_parameters, $_GET['elevation_to']);
  }
  
  if (isset($_GET['data_coverage_from'])) {
    $query .= ' AND data_coverage >= %f';
    array_push($query_parameters, $_GET['data_coverage_from']);
  }

  if (isset($_GET['data_coverage_to'])) {
    $query .= ' AND data_coverage <= %f';
    array_push($query_parameters, $_GET['data_coverage_to']);
  }

  if (isset($_GET['data_from'])) {
    $query .= ' AND max_date >= %s';
    array_push($query_parameters, $_GET['data_from']);
  }

  if (isset($_GET['data_to'])) {
    $query .= ' AND min_date <= %s';
    array_push($query_parameters, $_GET['data_to']);
  }

  if (isset($_GET['lat_from'])) {
    $query .= ' AND lat >= %f';
    array_push($query_parameters, $_GET['lat_from']);
  }
 
  if (isset($_GET['lat_to'])) {
    $query .= ' AND lat <= %f';
    array_push($query_parameters, $_GET['lat_to']);
  }

  if (isset($_GET['lng_from'])) {
    $query .= ' AND lng >= %f';
    array_push($query_parameters, $_GET['lng_from']);
  }

  if (isset($_GET['lng_to'])) {
    $query .= ' AND lng <= %f';
    array_push($query_parameters, $_GET['lng_to']);
  }
  
  $query .= ';';
  $prepared = NULL;

  if (sizeof($query_parameters) <= 0) {
    $prepared = $query;
  } else {
    $prepared = $wpdb->prepare(
      $query,
      $query_parameters
    );
  }

  $filtered = $wpdb->get_results($prepared);

  header('Content-Type: application/json');
  echo json_encode($filtered);
?>
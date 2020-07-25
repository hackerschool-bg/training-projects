<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$db = pg_connect("host=localhost port=5432 dbname=velin user=velin password=9810017583");

$query = "delete from ekatte;";
$result = pg_query($query);
$query = "delete from obstina;";
$result = pg_query($query);
$query = "delete from oblast;";
$result = pg_query($query);

?>

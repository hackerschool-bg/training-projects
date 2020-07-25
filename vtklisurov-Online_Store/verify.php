<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$dbcon = pg_connect("host=localhost port=5432 dbname=store user=velin password=9810017583");

$sql = "select hash from users where email=$1;";
$result = pg_prepare($dbcon,"query",$sql);
$result = pg_execute($dbcon,"query",array($_GET['email']));
$row = pg_fetch_row($result);
if ($row[0]!=$_GET['hash'])
{
  echo '<h1 align="center">Failure</h1><p align="center">Sorry, validation was unsuccessful</p>';
}
else {
  echo '<h1 align="center">Success</h1>
  <p align="center">Verification successful, you will be redirected shortly</p>
  <script>
 setTimeout(function(){
    window.location.replace("home.html");
  }, 5000);
  </script>';
  $sql = "update only users set status=1 where email=$1;";
  $result = pg_prepare($dbcon,"activate",$sql);
  $result = pg_execute($dbcon,"activate",array($_GET['email']));
}
?>

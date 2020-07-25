<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$dbcon = pg_connect("host=localhost port=5432 dbname=store user=velin password=9810017583");

$sql = "select pass, status from users where username=$1;";

$result = pg_prepare($dbcon,"query",$sql);
$result = pg_execute($dbcon,"query",array($_POST['uname']));
$row = pg_fetch_row($result);

if (pg_num_rows($result)!=0 && password_verify($_POST['pass'], $row[0]) && $row[1]==1) {
  echo 0;
  exit(0);
}
else if ($row[1]==0) {
  echo "WTF";
  exit(1);
}
else if ($row[1]==2) {
  echo 2;
  exit(2);
}
else if ($row[1]==3) {
  echo 4;
  exit(4);
}
else {
  echo 3;
  exit(3);
}

?>

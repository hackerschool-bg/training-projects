<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$db = pg_connect("host=localhost port=5432 dbname=store user=velin password=9810017583");
$entries = 10000;
$minstock = 0;
$maxstock = 100;
$minprice = 100;
$maxprice = 1000;
$query = "insert into products values";
for ($i=0; $i < $entries; $i++) {
  $stock=rand($minstock,$maxstock);
  $price=rand($minprice,$maxprice);
   $query.="(" . "$i" .", 'MyProduct$i'" . ", './images/placeholder.png'" . ", 'Description for MyProduct$i'" . ", " . $stock . ", " . $price . ")";
  if ($i<$entries-1) $query.=",";
  else $query.=" on conflict do nothing;";
}
$result = pg_query($query);
?>

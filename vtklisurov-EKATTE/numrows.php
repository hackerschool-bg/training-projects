<?php
$dbcon = pg_connect("host=localhost port=5432 dbname=velin user=velin password=9810017583");
$sql="select ekatte from ekatte;";
$result = pg_query($sql);
$rowcnt=pg_num_rows($result);
echo "<p>Селища: $rowcnt</p>";
$sql="select obstina from obstina;";
$result = pg_query($sql);
$rowcnt=pg_num_rows($result);
echo "<p>Общини: $rowcnt</p>";
$sql="select oblast from oblast;";
$result = pg_query($sql);
$rowcnt=pg_num_rows($result);
echo "<p>Области: $rowcnt</p>";
?>

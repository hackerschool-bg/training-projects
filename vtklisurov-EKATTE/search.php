<?php
   $dbcon = pg_connect("host=localhost port=5432 dbname=velin user=velin password=9810017583");

   $sql = "select ekatte.name, obstina.name, oblast.name, ekatte.kind
   from ekatte join obstina on ekatte.obstina=obstina.obstina join oblast on obstina.oblast=oblast.oblast
   where ekatte.name ilike $1;";

   $result = pg_prepare($dbcon,"query",$sql);
   $result = pg_execute($dbcon,"query",array($_POST['input'].'%'));

   echo"<style>table, th, td {
     border: 1px solid black;
     border-collapse: collapse;
     text-align:left;
     margin: auto;

   }</style>";
   echo "<table style='width:100%'>";
   echo "<tr><th>тип</th><th>име</th><th>община</th><th>област</th></tr>";
   while ($row = pg_fetch_row($result)) {
     echo "<tr><td>";
     if ($row[3]=='1') echo "град";
     elseif ($row[3]=='3') echo "село";
     elseif ($row[3]=='7') echo "манастир";
     echo"</td><td>$row[0]</td><td>$row[1]</td><td>$row[2]</td></tr>";
   }
?>

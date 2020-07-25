<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$dbcon = pg_connect("host=localhost port=5432 dbname=store user=velin password=9810017583");
$columns=4;

$result = pg_query("select * from products where stock >0;");
echo '<head>
<style>
* {
  box-sizing: border-box;
}

body {
  font-family: Arial, Helvetica, sans-serif;
}

.column {
  float: left;
  width: 25%;
  padding: 0 10px;
}

.row {margin: 0 -5px;}

.row:after {
  content: "";
  display: table;
  clear: both;
}

.card {
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  max-width: 300px;
  margin: auto;
  text-align: center;
  font-family: arial;
}

.price {
  color: grey;
  font-size: 22px;
}

.card button {
  border: none;
  outline: 0;
  padding: 12px;
  color: white;
  background-color: #000;
  text-align: center;
  cursor: pointer;
  width: 100%;
  font-size: 18px;
}

.card button:hover {
  opacity: 0.7;
}

div {
  word-wrap: break-word;
}
@media screen and (max-width: 800px) {
  .column {
    width: 100%;
    display: block;
    margin-bottom: 20px;
  }

</style>
</head>
<body>';
if(pg_num_rows($result) > 100) $numprod = 100;
else $numprods = pg_num_rows($result);
for ($i=1; $i <= $numprod; $i++) {
  $rnd = rand(0, pg_num_rows($result));

  echo ' <div class="column">
    <div class="card">
    <img src="' .pg_fetch_result($result, $rnd, 2) . '" alt="' .pg_fetch_result($result, $rnd, 1) . '" style="width:100%">
    <p style="font-size: 30px"><b>' .pg_fetch_result($result, $rnd, 1) . '</b><p>
    <p class="price">$' .pg_fetch_result($result, $rnd, 5) . '</p>
    <p>' .pg_fetch_result($result, $rnd, 3) . '</p>
    <p><button>Add to Cart</button></p>
    </div>
    </div>';

}
echo '</body>'
?>

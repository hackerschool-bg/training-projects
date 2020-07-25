<?php

  $user='velin';
  $pass='9810017583';
  $host='localhost';
  $db='wp_task';

  $dbcon = new mysqli($host,$user,$pass,$db);

  echo '<form name="filter" id="filter" action="/wp-content/plugins/map-integration/outputXML.php" method="GET"  target="dummyframe">
    <div>
      <label for="country">Country:</label>
      <input type="text" multiple="multiple" list="city_country" name="city_country" id="country" autocomplete="off"/>
      <datalist id="city_country">';
      $sqlget = "select distinct country from map_coords order by country";
      $sqldata= $dbcon->query($sqlget);
      while ($row = $sqldata->fetch_assoc())
      {
        echo '<option value="'. $row['country'] . '"> ' . $row['country'] . ' </option>';
      }

  echo '</datalist>
    </div>
    <div>
      <label for="name">City:</label>
      <input type="text" list="city_name" name="city_name" id="name" autocomplete="off"/>
      <datalist id="city_name">
      </datalist>
    </div>
    <div>
      <label for="timezone">Timezone:</label>
      <input type="text" list="city_timezone" name="city_timezone" autocomplete="off"/>
      <datalist id="city_timezone">
      <option value=""></option>';
      $sqlget = "select distinct timezone from map_coords order by timezone";
      $sqldata= $dbcon->query($sqlget);
      while ($row = $sqldata->fetch_assoc())
      {
        echo '<option value="'. $row['timezone'] . '"> ' . $row['timezone'] . ' </option>';
      }
  echo '</datalist>
    </div>
    <div>
      <label for="type">Type:</label>
      <select id="type" multiple name="city_type[]">
        <option value="ANY">ANY</option>
        <option value="PPL">Populated place</option>
        <option value="PPLA">Seat of 1st order admin. division</option>
        <option value="PPLA2">Seat of 2nd order admin. division</option>
        <option value="PPLA3">Seat of 3rd order admin. division</option>
        <option value="PPLA4">Seat of 4th order admin. division</option>
        <option value="PPLC">Capital</option>
        <option value="PPLF">Farm village</option>
        <option value="PPLG">Seat of gevornment entity</option>
        <option value="PPLh">Historical populated place</option>
        <option value="PPLL">Populated locality</option>
        <option value="PPLQ">Abandoned populated place</option>
        <option value="PPLR">Religious populated place</option>
        <option value="PPLW">Destroyed populated place</option>
        <option value="PPLX">Section of populated place</option>
      </select>
    </div>
    <div>
      <label for="lat1">First point latitude:</label>
      <input type="text" id="lat1" name="city_lat1">
    </div>
    <div>
      <label for="lng1">First point longitude:</label>
      <input type="text" id="lng1" name="city_lng1">
    </div>
    <div>
      <label for="lat2">Second point latitude:</label>
      <input type="text" id="lat2" name="city_lat2">
    </div>
    <div>
      <label for="lng2">Second point longitude:</label>
      <input type="text" id="lng2" name="city_lng2">
    </div>
    <div class="button">
    <button type="button" id="submit" onclick="validate()">Filter</button>
    </div>
    <div class="button">
    <button type="reset" onclick="deleteMarkers()">Reset</button>
    </div>
    </form>'
?>

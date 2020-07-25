<html>
<body>
<?php
   $user='velin';
   $pass='9810017583';
   $host='localhost';
   $db='wp_task';
   $dbcon = new mysqli($host,$user,$pass,$db);
   if ($dbcon->connect_error) {
       echo ("Connection failed");
   }


   $file = '/var/lib/mysql-files/CSVCities.csv';


 $sql = "
      LOAD DATA INFILE '/var/lib/mysql-files/CSVCities.csv'
      INTO TABLE map_coords
      FIELDS TERMINATED BY ';'
      LINES TERMINATED BY '\n'
      IGNORE 1 LINES
      (geoname_id, name, ascii_name, alternate_names, latitude, longitude, feature_class, feature_code, country_code, @dummy, @admin1_code, @admin2_code, @admin3_code, @admin4_code, population, @dummy, dem, timezone, modification_date, country)
      set admin1_code=NULLIF(@admin1_code, ''),
          admin2_code=NULLIF(@admin2_code, ''),
          admin3_code=NULLIF(@admin3_code, ''),
          admin4_code=NULLIF(@admin4_code, '');";

     if ($dbcon->query($sql) !== TRUE) {
       echo "Error: " . $sql . "<br>" . $dbcon->error;
     }

?>
</body>
<html>

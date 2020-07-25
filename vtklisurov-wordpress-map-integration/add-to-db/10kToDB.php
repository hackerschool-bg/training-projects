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


   $file = 'wp-content/plugins/map-integration/add-to-db/10kBiggest.json';


   $content = file_get_contents($file);
   $result = json_decode($content);

   for ($i=0; $i < 10000; $i++)
   {

     $result->records[$i]->fields->name = str_replace("'","''",$result->records[$i]->fields->name);
     $result->records[$i]->fields->admin1_code = str_replace("'","''",$result->records[$i]->fields->admin1_code);
     $result->records[$i]->fields->admin2_code = str_replace("'","''",$result->records[$i]->fields->admin2_code);
     $result->records[$i]->fields->admin3_code = str_replace("'","''",$result->records[$i]->fields->admin3_code);
     $result->records[$i]->fields->admin4_code = str_replace("'","''",$result->records[$i]->fields->admin4_code);
     $result->records[$i]->fields->country = str_replace("'","''",$result->records[$i]->fields->country);
     $result->records[$i]->fields->timezone = str_replace("'","''",$result->records[$i]->fields->timezone);
     $result->records[$i]->fields->ascii_name = str_replace("'","''",$result->records[$i]->fields->ascii_name);
     $result->records[$i]->fields->alternate_names = str_replace("'","''",$result->records[$i]->fields->alternate_names);

     $sqlcol = "insert into map_coords (name, latitude, longitude";
     $sqlval = "values ( '" . $result->records[$i]->fields->name . '\', \'' . $result->records[$i]->fields->latitude . '\', \'' . $result->records[$i]->fields->longitude;
     if(isset($result->records[$i]->fields->admin1_code))
     {
       $sqlcol .= ", admin1_code";
       $sqlval .= "', '" . $result->records[$i]->fields->admin1_code;
     }
     if(isset($result->records[$i]->fields->admin2_code))
     {
       $sqlcol .= ", admin2_code";
       $sqlval .= '\', \'' . $result->records[$i]->fields->admin2_code;
     }
     if(isset($result->records[$i]->fields->admin3_code))
     {
       $sqlcol .= ", admin3_code";
       $sqlval .= '\', \'' . $result->records[$i]->fields->admin3_code;
     }
     if(isset($result->records[$i]->fields->admin4_code))
     {
       $sqlcol .= ", admin4_code";
       $sqlval .= '\', \'' . $result->records[$i]->fields->admin4_code;
     }
     if(isset($result->records[$i]->fields->modification_date))
     {
       $sqlcol .= ", modification_date";
       $sqlval .= '\', \'' . $result->records[$i]->fields->modification_date;
     }
     if(isset($result->records[$i]->fields->country))
     {
       $sqlcol .= ", country";
       $sqlval .= '\', \'' . $result->records[$i]->fields->country;
     }
     if(isset($result->records[$i]->fields->country_code))
     {
       $sqlcol .= ", country_code";
       $sqlval .= '\', \'' . $result->records[$i]->fields->country_code;
     }
     if(isset($result->records[$i]->fields->feature_class))
     {
       $sqlcol .= ", feature_class";
       $sqlval .= '\', \'' . $result->records[$i]->fields->feature_class;
     }
     if(isset($result->records[$i]->fields->feature_code))
     {
       $sqlcol .= ", feature_code";
       $sqlval .= '\', \'' . $result->records[$i]->fields->feature_code;
     }
     if(isset($result->records[$i]->fields->alternate_names))
     {
       $sqlcol .= ", alternate_names";
       $sqlval .= '\', \'' . $result->records[$i]->fields->alternate_names;
     }
     if(isset($result->records[$i]->fields->geoname_id))
     {
       $sqlcol .= ", geoname_id";
       $sqlval .= '\', \'' . $result->records[$i]->fields->geoname_id;
     }
     if(isset($result->records[$i]->fields->timezone))
     {
       $sqlcol .= ", timezone";
       $sqlval .= '\', \'' . $result->records[$i]->fields->timezone;
     }
     if(isset($result->records[$i]->fields->dem))
     {
       $sqlcol .= ", dem";
       $sqlval .= '\', \'' . $result->records[$i]->fields->dem;
     }
     if(isset($result->records[$i]->fields->ascii_name))
     {
       $sqlcol .= ", ascii_name";
       $sqlval .= '\', \''.  $result->records[$i]->fields->ascii_name;
     }
     if(isset($result->records[$i]->fields->population))
     {
       $sqlcol .= ", population";
       $sqlval .= '\', \'' . $result->records[$i]->fields->population;
     }
     if(isset($result->records[$i]->fields->coordinates))
     {
       $sqlcol .= ", coordinates";
       $sqlval .= '\', '.  'POINT(' . $result->records[$i]->fields->coordinates[0] . ', ' . $result->records[$i]->fields->coordinates[1] . ')';
     }
     $sqlcol .= " ) ";
     if(isset($result->records[$i]->fields->coordinates)) $sqlval .= " );";
     else $sqlval .= "' );";

     $sql = $sqlcol . $sqlval;


     if ($dbcon->query($sql) !== TRUE) {
       echo "Error: " . $sql . "<br>" . $dbcon->error;
     }

   }


?>
</body>
<html>

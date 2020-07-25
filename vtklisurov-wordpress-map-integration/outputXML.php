<?php
   $dom = new DOMDocument("1.0");
   $node = $dom->createElement("markers");
   $parnode = $dom->appendChild($node);

   $user='velin';
   $pass='9810017583';
   $host='localhost';
   $db='wp_task';

   $dbcon = new mysqli($host,$user,$pass,$db);

   $data = [];
   $params = "";
   $where = [];

   if ( $_POST['city_name']!='') {
     $data[] = $_POST['city_name'];
     $params.="s";
     $where[] = "name = ?";
   }
   if ( $_POST['city_country']!='') {
     $data[] = $_POST['city_country'];
     $params.="s";
     $where[] = "country = ?";
   }
   if ( $_POST['city_timezone']!='') {
     $data[] = $_POST['city_timezone'];
     $params.="s";
     $where[] = "timezone = ?";
   }
   $type_input=[];
   $type_input=$_POST['city_type'];
   $types = "";
   $type_param = "";

   for($i = 0; $i<count($type_input); $i++){
     if ( $type_input[$i]!='ANY') {
       $type_param .= "s";
       $types .= "feature_code = ?";
       if ($i<(count($type_input)-1)) $types .= " or ";
       else{
          array_push($where, $types);
          $data = array_merge($data, $type_input);
          $params.=$type_param;
       }
     }
     else break;
   }

   $lat1 = $_POST['city_lat1'];
   $lat2 = $_POST['city_lat2'];
   $lng1 = $_POST['city_lng1'];
   $lng2 = $_POST['city_lng2'];
   if ( $lat1!='' && $lat2!='' && $lng1!='' && $lng2!='') {
     $params.="ssss";
     $minlat = min($lat1,$lat2);
     $maxlat= max($lat1,$lat2);
     $minlng = min($lng1,$lng2);
     $maxlng= max($lng1,$lng2);
     array_push($data, $minlat, $maxlat, $minlng, $maxlng);
     $where[] = "latitude >= ? and latitude <= ? and longitude >= ? and longitude <= ?";
   }

   $sql = "select id, name, latitude, longitude, country from map_coords";
   if ( count($where) > 0 ){
     $sql .= " where ". implode(" and ", $where) . " order by name;";
   }
echo $sql;
   $query = $dbcon->prepare($sql);
   $query->bind_param($params, ...$data);
   $query->execute();

   $result = $query->get_result();
   header("Content-type: text/xml");
   while ($row = $result->fetch_assoc())
   {
      $node = $dom->createElement("marker");
      $newnode = $parnode->appendChild($node);
      $newnode->setAttribute("id",$row['id']);
      $newnode->setAttribute("name",$row['name']);
      $newnode->setAttribute("lat", $row['latitude']);
      $newnode->setAttribute("lng", $row['longitude']);
      $newnode->setAttribute("country", $row['country']);
   }
   ob_clean();
   echo $dom->saveXML();
?>

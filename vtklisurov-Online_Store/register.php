<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$dbcon = pg_connect("host=localhost port=5432 dbname=store user=velin password=9810017583");

$result = pg_query("select username, email from users");
while ($row = pg_fetch_row($result)) {
  if ($_POST['uname'] == $row[0]) {
    #echo "alert('Username is not unique');";
    echo 1;
    exit(1);
  }
  if ($_POST['email'] == $row[1]) {
    #echo "alert('Email is not unique');";
    echo 2;
    exit(2);
  }
  if (strlen($_POST['pass']) < 5) {
    #echo "alert('Password is too short');";
    echo 3;
    exit(3);
  }
}

$hash = md5( rand(0,1000) );
$_POST['pass'] = password_hash($_POST['pass'], PASSWORD_DEFAULT);
$sql = "insert into users (username, pass, fname, lname, email, hash) values ($1,$2,$3,$4,$5,$6);";
$params = [];
array_push($params, $_POST['uname']);
array_push($params, $_POST['pass']);
array_push($params, $_POST['fname']);
array_push($params, $_POST['lname']);
array_push($params, $_POST['email']);
array_push($params, $hash);

$result = pg_prepare($dbcon,"query",$sql);
$result = pg_execute($dbcon,"query",$params);


$to      = $_POST['email'];
$subject = 'Verification';
$message = '

Thanks for signing up!
Your account has been created, you can login with the following username"'  .$_POST['uname']. '"after you have activated your account by pressing the url below.

Please click this link to activate your account:
http://localhost/Online_Store/verify.php?email='.$_POST['email'].'&hash='.$hash.'

';

$headers = 'From:noreply@yourwebsite.com' . "\r\n";
mail($to, $subject, $message, $headers);
?>

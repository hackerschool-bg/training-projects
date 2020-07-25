<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$db = pg_connect("host=localhost port=5432 dbname=velin user=velin password=9810017583");

$query = "create temp table t(like oblast) on commit drop;
COPY t(oblast,ekatte,name,region,doc,abc)
FROM PROGRAM 'mlr --csv cut -f oblast,ekatte,name,region,document,abc /var/www/html/Postgre_Task/Ek_obl.csv | tail -n +2' NULL AS '' csv;
INSERT INTO oblast SELECT * FROM t ON CONFLICT DO NOTHING;";
$result = pg_query($query);

$query = "create temp table t(like obstina) on commit drop;
COPY t(obstina,ekatte,name,category,doc,abc)
FROM PROGRAM 'mlr --csv cut -f obstina,ekatte,name,category,document,abc /var/www/html/Postgre_Task/Ek_obst.csv | tail -n +2' NULL AS '' csv;
UPDATE t SET oblast = substring(obstina from 1 for 3);
INSERT INTO obstina SELECT * FROM t ON CONFLICT DO NOTHING;";
$result = pg_query($query);

$query = "create temp table t(like ekatte) on commit drop;
COPY t(ekatte,name,obstina,kmetstvo,kind,category,altitude,doc,tsb,abc)
FROM PROGRAM 'mlr --csv cut -f ekatte,name,kmetstvo,obstina,kind,category,altitude,document,tsb,abc /var/www/html/Postgre_Task/Ek_atte.csv | tail -n +3' NULL AS '' csv;
INSERT INTO ekatte SELECT * FROM t ON CONFLICT DO NOTHING;";
$result = pg_query($query);

?>

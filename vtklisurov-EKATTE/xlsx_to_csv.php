<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require 'vendor/autoload.php';

use \PhpOffice\PhpSpreadsheet\Reader\Xlsx;
use \PhpOffice\PhpSpreadsheet\Writer\Csv;

$files= array("Ek_obl.xlsx","Ek_obst.xlsx", "Ek_atte.xlsx");

foreach ($files as $xls_file) {

  $reader = new Xlsx();
  $spreadsheet = $reader->load($xls_file);

  $loadedSheetNames = $spreadsheet->getSheetNames();

  $writer = new Csv($spreadsheet);

  foreach($loadedSheetNames as $sheetIndex => $loadedSheetName) {
      $writer->setSheetIndex($sheetIndex);
      $writer->save($loadedSheetName.'.csv');
  }
}

?>

const assert = require('assert');
const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'ekatte',
  password: 'ekatte',
  database: 'ekatte'
});

const provincesFile = xlsx.readFile('ekatte_xls/Ek_obl.xls');
assert.strictEqual(provincesFile instanceof Object, true, 'File is not read as a Workbook');
assert.strictEqual(provincesFile.Sheets instanceof Object, true, 'Object \'provincesFile\' does not have an object property \'Sheets\'');
assert.strictEqual(provincesFile.Sheets.Ek_obl instanceof Object, true, 'Object \'Sheets\' does not have an object property \'Ek_obl\'');
const provincesFileParsed = xlsx.utils.sheet_to_json(provincesFile.Sheets.Ek_obl);

const municipalitiesFile = xlsx.readFile('ekatte_xls/Ek_obst.xls');
assert.strictEqual(municipalitiesFile instanceof Object, true, 'File is not read as a Workbook');
assert.strictEqual(municipalitiesFile.Sheets instanceof Object, true, 'Object \'municipalitiesFile\' does not have an object property \'Sheets\'');
assert.strictEqual(municipalitiesFile.Sheets.Ek_obst instanceof Object, true, 'Object \'Sheets\' does not have an object property \'Ek_obst\'');
const municipalitiesFileParsed = xlsx.utils.sheet_to_json(municipalitiesFile.Sheets.Ek_obst);

const ekattesFile = xlsx.readFile('ekatte_xls/Ek_atte.xls');
assert.strictEqual(ekattesFile instanceof Object, true, 'File is not read as a Workbook');
assert.strictEqual(ekattesFile.Sheets instanceof Object, true, 'Object \'ekattesFile\' does not have an object property \'Sheets\'');
assert.strictEqual(ekattesFile.Sheets.Ek_atte instanceof Object, true, 'Object \'Sheets\' does not have an object property \'Ek_atte\'');
const ekattesFileParsed = xlsx.utils.sheet_to_json(ekattesFile.Sheets.Ek_atte);
ekattesFileParsed.shift(); // first row is not valid data

client.connect().then(() => {
  console.log('Successfully connected to database');
  return client.query(`INSERT INTO provinces
    (id, region, document)
  SELECT * FROM UNNEST ($1::TEXT[], $2::TEXT[], $3::TEXT[])
  ON CONFLICT (id) DO
  UPDATE SET
    region = EXCLUDED.region,
    document = EXCLUDED.document;`,
  [
    provincesFileParsed.map(row => row.oblast),
    provincesFileParsed.map(row => row.region),
    provincesFileParsed.map(row => row.document)
  ]
  );
}).then(() => {
  console.log('Inserted provinces');
  return client.query(`INSERT INTO municipalities
    (id, category, document, province_id)
  SELECT * FROM UNNEST ($1::TEXT[], $2::INT[], $3::TEXT[], $4::TEXT[])
  ON CONFLICT (id) DO
  UPDATE SET
    category = EXCLUDED.category,
    document = EXCLUDED.document,
    province_id = EXCLUDED.province_id;`,
  [
    municipalitiesFileParsed.map(row => row.obstina),
    municipalitiesFileParsed.map(row => parseInt(row.category)),
    municipalitiesFileParsed.map(row => row.document),
    municipalitiesFileParsed.map(row => ekattesFileParsed.find(e => e.ekatte === row.ekatte).oblast)
  ]
  );
}).then(() => {
  console.log('Inserted municipalities');
  return client.query(`INSERT INTO ekattes
      (id, kind, name, category, altitude_code, document, municipality_id)
    SELECT * FROM UNNEST ($1::TEXT[], $2::INT[], $3::TEXT[], $4::INT[], $5::INT[], $6::TEXT[], $7::TEXT[])
    ON CONFLICT (id) DO
    UPDATE SET
      kind = EXCLUDED.kind,
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      altitude_code = EXCLUDED.altitude_code,
      document = EXCLUDED.document,
      municipality_id = EXCLUDED.municipality_id;`,
  [
    ekattesFileParsed.map(row => row.ekatte),
    ekattesFileParsed.map(row => parseInt(row.kind)),
    ekattesFileParsed.map(row => row.name),
    ekattesFileParsed.map(row => parseInt(row.category)),
    ekattesFileParsed.map(row => parseInt(row.altitude)),
    ekattesFileParsed.map(row => row.document),
    ekattesFileParsed.map(row => row.obstina)
  ]
  );
}).then(() => {
  console.log('Inserted ekattes');
  console.log('Success!');
  process.exit();
}).catch(error => {
  console.error(error);
});

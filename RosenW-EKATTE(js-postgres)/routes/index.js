var express = require('express');
const pg = require('pg');
var fs = require('fs');
var sqlFormatter = require('pg-format');

var router = express.Router();

var areasData = fs.readFileSync('jsons/areas.json', 'utf8');
var municData = fs.readFileSync('jsons/municipalities.json', 'utf8');
var settlementsData = fs.readFileSync('jsons/settlements.json','utf8');

var areasJson = JSON.parse(areasData);
var municJson = JSON.parse(municData);
var settlementsJson = JSON.parse(settlementsData);

// Database connection
const client = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'ekatte_db',
  password: '1234',
  port: 5432,
});
client.connect();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { 'data': 'done'});
});

router.get('/insert', function(req, res, next) {
  insertDataIntoDB();
  res.render('index', { 'data': 'done'});
});

router.get('/getdata', function(req, res){
  var settlements = [];
  var municipalities = [];
  var areas = [];
  client.query('select * from selishta as s order by s.name asc')
  .then(data => {
    data.rows.forEach((row)=>{
      var curSettlement = {}
      curSettlement['name'] = row.name;
      curSettlement['municipality'] = row.municipality_id;
      settlements.push(curSettlement);
    });
    client.query('select * from obshtini as o order by o.name asc').then(data => {
      data.rows.forEach((row)=>{
        var curMunic = {}
        curMunic['id'] = row.id;
        curMunic['name'] = row.name;
        curMunic['area'] = row.area_id;
        municipalities.push(curMunic);
      });
      client.query('select * from oblasti as o order by o.name asc')
      .then(data => {
        data.rows.forEach((row)=>{
          var curArea = {}
          curArea['id'] = row.id;
          curArea['name'] = row.name;
          areas.push(curArea);
        });
        res.send({ settlements: settlements, municipalities: municipalities, areas: areas});
      });
    });
  })
  .catch(e => console.error(e.stack));
});

function insertDataIntoDB(){
  areasJson.Ek_obl.forEach((area)=>{
    var areaId = addSlashes(area[0]);
    var areaName = addSlashes(area[2]);
    if(areaId.length === 3){
    client.query(sqlFormatter("insert into oblasti (id, name) values(%L, %L);", areaId, areaName))
    .then(()=>{
      municJson.Ek_obst.forEach((munic)=>{
        if(areaId == getAreaByMunicipId(munic[0])){
          var municId = addSlashes(munic[0]);
          var municName = addSlashes(munic[2]);
          var curAreaId = addSlashes(getAreaByMunicipId(municId));
          client.query(sqlFormatter("insert into obshtini (id, name, area_id) values(%L, %L, %L);", municId, municName, curAreaId))
          .then(()=>{
            settlementsJson.Ek_atte.forEach((settlement)=>{
            if(municId == settlement[4]){
              var settlementId = addSlashes(settlement[0]);
              var settlementName = addSlashes(settlement[2]);
              var curMunicId = addSlashes(settlement[4]);
              client.query(sqlFormatter("insert into selishta (id, name, municipality_id) values(%L, %L, %L);", settlementId, settlementName, curMunicId))
              .catch(e => console.error(e.stack));
              }
            });
          })
          .catch(e => console.error(e.stack));
      }
      });
    })
    .catch(e => console.error(e.stack));
    }
  });
}

function getAreaByMunicipId(id){
  return id.substr(0,3);
}

function getMunicipById (id){
  client.query("select name from obshtini where id = "+id)
  .then((selectedId) => {
    console.log(selectedId);
    res.render('index', { 'data': settlements});
  })
  .catch(e => console.error(e.stack));
}

function addSlashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

module.exports = router;

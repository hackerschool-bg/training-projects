let client = require('../../database/db');
let u = require('../../utils/utils');
let net = require('net');
let lp = require('node-lp');
let cmd = require('node-cmd');

let HOST = '10.20.1.104';
let PORT = 9100;

let lineFeedCommand = new Buffer([0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A]);
let cutCommand = new Buffer([0x1B, 0x69]);
let setBoldCommand = new Buffer([0x1B, 0x21, 0x128]);
let setNormalCommand = new Buffer([0x1B, 0x21, 0x00]);
let newLineCommand = new Buffer([0x0A]);

module.exports = {
    getPrint: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let data = await client.query('select * from printformats where id = 1');
        let format = data.rows[0].format;
        res.render('print', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'format': format
            }
        });
    },
    postPrintFormat: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }

        let newFormat = req.body.format;
        await client.query("update printformats set format = $1 where id = 1", [newFormat]);
        res.redirect(303, '/check?state=4&groupby=3&sort=1&from=01-01-1999&to=01-01-2050&word=');
    },
    postPrint: async function(req, res) {
        let maxLength = 0;
        let total = req.body.total.substr(1,);
        let user = req.body.user;
        let names = req.body['names[]'];
        let qs = req.body['qs[]'];
        let prices = req.body['prices[]'];
        let data = await client.query(
          'select * from printformats where id = 1');
        let userRow = await client.query(
          'select first_name from accounts where id = $1', [user]);
        let curUser = userRow.rows[0].first_name;
        let format = data.rows[0].format;
        let info = '';
        for(let i = 0; i<names.length;i++){
            if(names[i].length <= 25){
              for(let j = names[i].length; j<25;j++){
                names[i] += '.';
              }
            }else{
              names[i] = names[i].substr(0,22) + '...';
            }
            let wholeStr = names[i] + 'x' + qs[i] + ' - ' + prices[i].substr(1,);
            if(wholeStr.length > maxLength){
              maxLength = wholeStr.length;
            }
        }
        for(let i = 0; i<names.length;i++){
          let wholeStr = names[i] + 'x' + qs[i] + ' - ' + prices[i].substr(1,);
          let paddingRequired = maxLength - wholeStr.length;
          let paddingString = '';
          for(let j = 0; j<paddingRequired;j++){
            paddingString+='.';
          }
          info += names[i] + 'x' + qs[i] + ' - ' + paddingString + prices[i].substr(1,) + '\n';
        }
        let paddingRequired = maxLength - ('Total: ' + total).length;
        let paddingString = '';
        for(let j = 0; j<paddingRequired;j++){
          paddingString+='.'; // TODO: replace with fixed space
        }
        info += 'Total: ' + paddingString + total;

        format = format.replace(/!I/g, info);
        format = format.replace(/!T/g, total);
        format = format.replace(/!U/g, curUser);
        format = format.replace(/ESC/g, '\x1b');
        format = format.replace(/GS/g, '\x1d');

        lines = format.split('\r\n');

        replacedText = ''

        for (let i in lines) {
          if(lines[i].substr(0,1) == '\u001b' || lines[i].substr(0,1) == '\u001d'){
            let n = lines[i].replace( /^\D+/g, ''); //doesnt change lines[i]
            let comm = lines[i].replace( /[0-9]/g, '');

            let asciiValue = String.fromCharCode(Number(n));
            if(asciiValue.charCodeAt(0) != 0){
              comm += asciiValue;
            }
            replacedText += comm;
          }else{
            replacedText += lines[i] + '\n';
          }
        }


        cmd.get('echo "' + replacedText + '" | lp', function(err, data, stderr){
          console.log(err);
          console.log(data);
          console.log(stderr);
        });
    }
}


        // let cyrillicCompatibleText = '';
        // let codes = [];        
        //17 - 11
        //28 - 1c - 1251
        //36 - 24
        // let p1251 = '\x1b\x74\x1c\n';
        // for (let i = 0; i <= 2000; i++) { // TEST
        //     let currentChar = String.fromCharCode(i);
        //     // if(currentChar != '\'' && currentChar != '\"' && currentChar != '\`' ){
        //       p1251 += currentChar;
        //     // }
        // }
        // p1251 += 'абвгдежзийклмнопрстуфхцчшщьъюя'
        // p1251 += '\x1bi'
        //
        // p1251u = u.utf8_decode(p1251);
        //
        // for (var i = 0; i < p1251.length; i++) {
        //   console.log(p1251.charCodeAt(i));
        // }
        // console.log(p1251);
        //
        // console.log('.......................');
        //
        // for (var i = 0; i < p1251u.length; i++) {
        //   console.log(p1251u.charCodeAt(i));
        // }
        // console.log(p1251u);

        // for (let index in replacedText) {
        //   symbolCode = replacedText.charCodeAt(index);
        //   cyrillicCompatibleText += String.fromCharCode(symbolCode - 848);
          // if(symbolCode > 1000){
          //   codes.push(symbolCode-848);
          //   cyrillicCompatibleText += String.fromCharCode(symbolCode - 848); //hardcodded
          // }else{
          //   codes.push(symbolCode);
          //   cyrillicCompatibleText += replacedText[index];
          // }
        // }

        // console.log(cyrillicCompatibleText);
        // console.log(codes);

        // console.log(u.utf8_decode('��������������������������'));

        // bruteForceTestStringDec = u.utf8_decode('�абвгдежзийклмнопрстуфхцчшщьъюя');
        // for (var i = 0; i < bruteForceTestStringDec.length; i++) {
        //   console.log(bruteForceTestStringDec.charCodeAt(i));
        // }
        // console.log(bruteForceTestStringDec);
        //
        // cmd.get('echo "'+ '\x1b\x74\x1c' + bruteForceTestStringDec +'" | lp', function(err, data, stderr){
        //   console.log(err);
        //   console.log(data);
        //   console.log(stderr);
        // });
        //
        //
        //
        // bruteForceTestString = 'абвгдежзийклмнопрстуфхцчшщьъюя';
        // for (var i = 0; i < bruteForceTestString.length; i++) {
        //   console.log(bruteForceTestString.charCodeAt(i));
        // }
        // console.log(bruteForceTestString);
        //
        // cmd.get('echo "'+ '\x1b\x74\x1c' + bruteForceTestString +'" | lp', function(err, data, stderr){
        //   console.log(err);
        //   console.log(data);
        //   console.log(stderr);
        // });

        // for (var i = 16; i <= 42; i++) {
        //   bruteForceTestString += '\x1b\x74';
        //   bruteForceTestString += String.fromCharCode(i);
        //   console.log(String.fromCharCode(i));
        //   bruteForceTestString += utf8_decode('абвгдежзийклмнопрстуфхцчшщьъюя') + i;
        // }

        // cmd.get('echo "тест" > file.tmp', function(err, data, stderr){
        //   console.log(err);
        //   console.log(data);
        //   console.log(stderr);
        // });

        // cmd.get('echo "' + u.utf8_decode(p1251) + '" | lp', function(err, data, stderr){
        //   console.log(err);
        //   console.log(data);
        //   console.log(stderr);
        // });
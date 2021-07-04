let client = require('../../database/db');
let u = require('../../utils/utils');
let request = require('request');

module.exports = {
    getHome: async function(req, res, next) {
        let passNotfic = false;
        let profileInfoNotific = false;
        let linkSentToMail = false;
        let googleRegistrationMessage = false;
        let googleAlreadyRegisteredMessage = false;
        let forgottenPassNotif = false;
        if(req.query.pc==1){
            passNotfic = true;
        }
        if(req.query.fpe==1){
          forgottenPassNotif = true;
        }
        if(req.query.pi==1){
            profileInfoNotific = true;
        }
        if(req.query.reg==1){
            linkSentToMail = true;
        }
        if(req.query.reg==2){
            googleRegistrationMessage = true;
        }
        if(req.query.fail==1){
            googleAlreadyRegisteredMessage = true;
        }
        let categories = [];
        let eightNewProds = [];
        let threeNewProds = [];
        let cats = await client.query("select * from categories");
        let newproducts = await client.query("select * from products as p order by p.name limit 11");
        for(let i = 0; i<8;i++){
            eightNewProds.push(newproducts.rows[i]);
        }

        for(let i = 8; i<11;i++){
            threeNewProds.push(newproducts.rows[i]);
        }

        await cats.rows.forEach((cat)=>{
            categories.push(cat);
        });

        if(!req.session.admin){
          res.render('categories', {
              data: {
                  'isLoggedIn': req.session.loggedIn,
                  'user': req.session.username,
                  'isAdmin': req.session.admin,
                  'cats': categories,
                  'eight': eightNewProds,
                  'three': threeNewProds,
                  'pc': passNotfic,
                  'pi': profileInfoNotific,
                  'reg': linkSentToMail,
                  'GRM': googleRegistrationMessage,
                  'GARM': googleAlreadyRegisteredMessage,
                  'fpe': forgottenPassNotif
              }
          });
        }else{
            res.render('oldCategories', {
                data: {
                    'isLoggedIn': req.session.loggedIn,
                    'user': req.session.username,
                    'isAdmin': req.session.admin,
                    'cat': categories,
                    'eight': eightNewProds,
                    'three': threeNewProds,
                    'pc': passNotfic,
                    'pi': profileInfoNotific,
                    'reg': linkSentToMail
                }
            });
        }
    },
    postHome: async function(req, res, next) {
      let word = req.body.name;
      let count = 1;
      if (/^[a-zA-Z\s+]+$/.test(word)) {
        let data = await client.query(
          "select * from products where lower(name) like concat('%', $1::text, '%') order by name",
          [word.toLowerCase()]);
        let products = data.rows;
        products.forEach((prod)=>{
          prod.price = u.addTrailingZeros(prod.price);
        });
        if(req.session.admin){
          res.render('index', {
              data: {
                  'isLoggedIn': req.session.loggedIn,
                  'user': req.session.username,
                  'isAdmin': req.session.admin,
                  'prods': products
              }
          });
        }else{
          res.redirect(303, '/category/0/1/'+word+'?page='+1);
        }
      } else {
          res.redirect(303, '/');
      }
    },
    getCategory: async function(req, res, next) {
      let products = [];
      let word = req.params.word;
      let page = Number(req.query.page);
      if(word == '*'){
        word = '';
      }
      let catId = req.params.id;
      let sort = Number(req.params.sort);
      let sortString;
      let from = req.query.from;
      let to = req.query.to;

      if(!Number(from)){
        from = 0;
      }
      if(!Number(to)){
        to = 999999;
      }
      console.log(from);
      console.log(to);
      switch(sort){
        case 1:
          sortString = 'p.name';
          break;
        case 2:
          sortString = 'p.price';
          break;
        case 3:
          sortString = 'p.name desc';
          break;
        case 4:
          sortString = 'p.price desc';
          break;
      }
      let prods;
      let catData;
      if(catId == 0){
        prods = await client.query(
          "select distinct(p.id), p.name, p.price, p.quantity, p.img from products as p " +
          "join products_categories as pc on pc.product = p.id " +
          "where lower(name) like concat('%', $1::text, '%') "+
          "and p.price between $2 and $3 " +
          "group by p.id " +
          "order by " + sortString, [word.toLowerCase(), from, to]);
      }else{
        prods = await client.query(
          "select distinct(p.id), p.name, p.price, p.quantity, p.img from products as p " +
          "join products_categories as pc on pc.product = p.id " +
          "where pc.category = $1 and lower(name) like concat('%', $2::text, '%') " +
          "and p.price between $3 and $4 " +
          "order by " + sortString, [catId, word.toLowerCase(), from, to]);
        catData = await client.query(
          "select c.name as cname from categories as c " +
          "where c.id = $1 limit 1", [catId]);
      }
      let number = 0;
      await prods.rows.forEach((prod) => {
          prod.number = ++number;
          prod.price = u.addTrailingZeros(prod.price);
          products.push(prod);
      });
      if(word==''){
        word = '*';
      }
      let cname;
      if(catData==undefined){
        cname = 'Searching Products By Name';
      }else{
        cname = catData.rows[0].cname;
      }
      if(!req.session.admin){
        res.render('newIndex', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'prods': products.slice((page-1)*10, page*10),
                'cname': cname,
                'catid': catId,
                'word': word,
                'sort': sort,
                'page': page,
                'from': from,
                'to': to
            }
        });
      }else{
        if(!u.contains(req.session.roles, 1)){
          res.redirect(303, '/');
        }
        res.render('index', {
          data: {
            'isLoggedIn': req.session.loggedIn,
            'user': req.session.username,
            'isAdmin': req.session.admin,
            'prods': products
          }
        });
      }
    },
    postCategory: async function(req, res, next) {
      let word = req.params.word;
      let from = req.body.from;
      let to = req.body.to;
      let catId = req.params.id;
      let sort = Number(req.params.sort);

      res.redirect(303, '/category/'+catId+'/'+sort+'/'+word+'?page=1&from='+from+'&to=' + to);
    },
    getSteal: async function(req, res, next) {
      console.log('STEALING !!! is DEPRECATED');
      // generateProducts();
      // res.render('index', {
      //     data: {
      //         'isLoggedIn': false,
      //         'user': false,
      //         'isAdmin': false,
      //         'prods': []
      //     }
      // });
    }
}

async function generateProducts(){
  for (var i = 1; i < 58; i++) {
    await request({
      uri: "https://www.thegreenoffice.com/search?q=mailing&page=" + i,
    },async function(error, response, body) {
      let nameRegex = /<h4>(.*?)<\/h4><\/a>/g;
      let priceRegex = /<div class="price">(.*?)<\/div>/g;
      let imgRegex = /<img class="thumb" src="(.*?)"/g
      let nameMatch;
      let priceMatch;
      let imgMatch;

      console.log('adding from page: ' + i);
      do {
          let curProd = {};
          nameMatch = nameRegex.exec(body);
          priceMatch = priceRegex.exec(body);
          imgMatch = imgRegex.exec(body);
          if (nameMatch) {
              curProd.name = nameMatch[1];
          }
          if (priceMatch) {
              curProd.price = Number(priceMatch[1].substr(1,));
          }
          if (imgMatch) {
              curProd.img = imgMatch[1];
          }
          await client.query(
            "insert into products (name, price, quantity, description, img) values($1, $2, 1000, '', $3)", [curProd.name, curProd.price, curProd.img]);
          let maxId = await client.query("select max(id) as id from products");
          let curMaxId = maxId.rows[0].id;
          await client.query(
            "insert into products_categories (product, category) values($1, 6)", [curMaxId]);
      } while (nameMatch);
    });
  }
}

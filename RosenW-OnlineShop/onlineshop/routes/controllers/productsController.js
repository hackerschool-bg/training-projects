let client = require('../../database/db');
let u = require('../../utils/utils');

module.exports = {
    getAddProduct: async function(req, res, next) {
        if (!req.session.admin || !u.contains(req.session.roles, 1)) {
            res.redirect(303, '/');
        }
        let ctg = [];
        let data = await client.query("select * from categories");
        await data.rows.forEach((row) => ctg.push(row.name));
        res.render('add', {
            data: {
                'isLoggedIn': req.session.loggedIn,
                'user': req.session.username,
                'isAdmin': req.session.admin,
                'ctg': ctg
            }
        });
    }
}

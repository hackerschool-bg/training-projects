let nodemailer = require('nodemailer');

// set up email
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mailsender6000@gmail.com',
        pass: 'edno!dve@tri#'
    }
});

module.exports = transporter;

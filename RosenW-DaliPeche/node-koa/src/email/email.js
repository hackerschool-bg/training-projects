let nodemailer = require('nodemailer');

// set up email
let smtpTransporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: 'mailsender6000@gmail.com',
        pass: 'edno!dve@tri#'
    }
});

module.exports = smtpTransporter;

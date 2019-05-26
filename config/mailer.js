const xoauth2 = require('xoauth2');
const nodemailer = require('nodemailer');

// Node Mailer Config
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        type: "login",
        user: 'yourscuffed@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

// Send Email
module.exports = {

    sendEmail: function(emailTo, hash) {
        // Mail Options
        const mailOptions = {
            from: 'Fantasy Overwatch',
            to: emailTo,
            subject: 'League Invitation',
            html: '<p>Hello,<br><br>You have been invited to join a Fantasy Overwatch league at YourScuffed! ' + 
            'Please click the link below to join!<br><br>http://localhost:5000/league/join/' + hash +
            '<br><br>Thanks,<br>YourScuffed</p>'
        }

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) { console.log(err); }
        });
    }
}
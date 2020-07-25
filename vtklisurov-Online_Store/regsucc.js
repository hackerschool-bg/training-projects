var success = ' <!DOCTYPE html>' +
' <head>' +
' ' +
' </head>' +
' <body>' +
' <h1 align="center">' +
'   Success' +
' </h1>' +
' <p align="center">A verification email has been sent. Please click the link to verify your account</p>' +
' <p align="center">You will be redirected shortly</p>' +
' <script>' +
' setTimeout(function(){window.location.href="/"},5000)' +
' </script>' +
' </body>';

module.exports = { success };

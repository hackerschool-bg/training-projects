let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let flash = require('connect-flash');
let logger = require('morgan');
let bodyParser = require('body-parser');
let session = require('express-session');
let fileUpload = require('express-fileupload')
let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');
let passport = require('passport');
let auth = require('./authentication/auth');

let app = express();

// Use the session middleware
app.use(session({ secret: 'secret123123', cookie: { maxAge: 3600000 }}));
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

// default options
app.use(fileUpload());

app.post('/upload', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.img;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv('/public/images/test.jpg', function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
  });
});

app.use(bodyParser.json());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
//captcha
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

module.exports = app;

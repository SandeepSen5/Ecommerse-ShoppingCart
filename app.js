var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const expressLayout = require('express-ejs-layouts');
var logger = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const flash = require('express-flash');
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const methodOverride = require('method-override');
const dotenv = require("dotenv").config();



var app = express();



var adminRouter = require('./routes/admin');
var usersRouter = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', './layouts/layout')
app.use(methodOverride('_method'));

app.use(session({
  secret: "key",
  resave: true,
  saveUninitialized: true
}))
app.use(expressLayout);
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// DB Config
// const db = require('./config/keys').MongoURI;
const db = process.env.MongoURI;

//connect to mongodb
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// load static assets
app.use('/', express.static(path.join(__dirname, 'public')))

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});


app.use('/admin', adminRouter);
app.use('/user', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error',{other:true});
});

module.exports = app;








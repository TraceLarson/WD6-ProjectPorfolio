const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser");
const expressHbs = require("express-handlebars");
const mongoose = require("mongoose");
const expressSession = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const validator = require("express-validator");

/* Express App */
let app = express();

// Middleware executed on all requests
app.use((req, res, next) => {
  // Save user authentication state in a global var, allowing use in all routes
  res.locals.login = req.isAuthenticated();
  next();
});

/* Route Imports */
const indexRouter = require('./routes/index');
const userRouter = require("./routes/user");

/* Database */
mongoose.connect("mongodb://localhost:27017/gamedrop", { useNewUrlParser: true });

// Setup passport
require("./config/passport");

/* View Engine */
app.engine(".hbs", expressHbs({
  defaultLayout: "layout",
  extname: ".hbs"
}));
app.set('view engine', '.hbs');

/* Middleware */
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use(expressSession({
  secret: "798had83hbyawd67b",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public'))); // Static file serving

/* Routes */
app.use("/user", userRouter);
app.use('/', indexRouter);

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

module.exports = app;

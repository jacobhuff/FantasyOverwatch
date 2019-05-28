const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// style config
app.use(express.static(path.join(__dirname, 'public')));

// Passport Config
require('./config/passport')(passport);

// DB Config
const db = require('./config/keys').mongoURI;

// Connect to MongoDB
mongoose.connect(db, { useNewUrlParser: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));
mongoose.set('useFindAndModify', false);

// EJS
app.set('view engine', 'ejs');

// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.use('/', require('./routes/index.js'));
app.use('/dashboard', require('./routes/dashboard.js'));
app.use('/users', require('./routes/users.js'));
app.use('/league', require('./routes/league.js'));
app.use('/players', require('./routes/players.js'));

// UPDATE PLAYERS IN DATABASE
// const getOwlSchedule = require('./api/getOwlSchedule.js');
// getOwlSchedule();
// const getPlayers = require('./api/getPlayers.js');
// getPlayers();
// const setAvailable = require('./api/setAvailable.js');
// setAvailable("Test");
// const initializeLeague = require('./api/initializeLeague.js');
// initializeLeague("Test", new Date().getTime());

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log("Server started: http://localhost:" +  PORT));
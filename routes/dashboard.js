const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
// Load League model
const League = require('../models/League');
const Team = require('../models/Team');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Dashboard
router.get('/', ensureAuthenticated, (req, res) => {

    // Get User's Leagues
    League.find({email: req.user.email}, function(err, leagues) {
        if (err) { return handleError(err); }
        Team.find({email: req.user.email}, function(err, teams) {
            res.render('dashboard', {
                user: req.user,
                email: req.user.email,
                leagues: leagues,
                teams: teams
            });
        });
    });

});

// Create New League
router.post('/new-league/', (req, res) => {
    res.redirect('/dashboard/new-league')
});

router.get('/new-league', ensureAuthenticated, (req, res) => {
    res.render('new-league');
});

// Add League to Database
router.post('/create-league/', (req, res) => {
    var email = req.user.email;
    var administrator = req.user.name;
    var numTeams = 0;
    var id = crypto.randomBytes(10).toString('hex');
    var active = false;
    const { name, password, password2 } = req.body;
    let errors = [];

    if (!name || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password != password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('new-league', {
            errors,
            name,
            password,
            password2
        });
    } else {
        League.findOne({ name: name }).then(league => {
            if (league) {
                errors.push({ msg: 'A League with that name already exists' });
                res.render('new-league', {
                    errors,
                    name,
                    password,
                    password2
                });
            } else {
                const newLeague = new League({
                    name,
                    numTeams,
                    email,
                    password,
                    administrator,
                    id,
                    active
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newLeague.password, salt, (err, hash) => {
                        if (err) throw err;
                        newLeague.password = hash;
                        newLeague
                            .save()
                            .then(league => {
                                req.flash(
                                    'success_msg',
                                    'Your new league has been created'
                                );
                                res.redirect('/league/create-team/?league=' + name);
                            })
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

module.exports = router;
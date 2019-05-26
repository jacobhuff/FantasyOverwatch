const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
// Load League model
const League = require('../models/League');
const Team = require('../models/Team');
const mailer = require('../config/mailer');

// League Dashboard
router.get('/', ensureAuthenticated, (req, res) => {
    // Get League Info (Standings, Teams, Stats, Schedule, Week, Matchups)
    if (!req.session.currLeague) {
        res.redirect('/dashboard');
    }
    League.findOne({name: req.session.currLeague}).then(league => {
        var isOwner = false;
        if (league.administrator === req.user.name) {
            // current user is owner of league
            isOwner = true;
        }
        res.render('league', {
            numTeams: league.numTeams,
            isOwner: isOwner,
            isActive: league.active
        });
    });
});
router.post('/', (req, res) => {
    // Set Current League variable
    req.session.currLeague = req.body.leagueName;

    // render league page
    res.redirect('league');
});

// LEAGUE INVITES
router.get('/invite', ensureAuthenticated, (req, res) => {
    res.render('invite');
});
router.post('/invite', ensureAuthenticated, (req, res) => {
    // send email invitation

    League.findOne({name: req.session.currLeague}).then(league => {
        mailer.sendEmail(req.body.email, league.id);
    });

    res.redirect('/league');
});
router.get('/join/:hash', (req, res) => {
    // check if link is valid
    var isValid = false;
    League.findOne({id: req.params.hash}).then(league => {
        if (league) {
            isValid = true;
        }
        if (!isValid) {
            // -----------------------------------------
            // link was invalid or league no longer exists
            // -----------------------------------------
        }
        res.redirect('/users/login/join/?league=' + league.name);
    });
});

router.get('/create-team', ensureAuthenticated, (req, res) => {
    if (!req.session.currLeague || req.query.league) {
        req.session.currLeague = req.query.league;
    }
    res.render('new-team');
});

router.post('/create-team', ensureAuthenticated, (req, res) => {
    // create new team and add to DB
    // Current League: req.session.currLeague
    var email = req.user.email;
    var owner = req.user.name;
    var league = req.session.currLeague;
    var record = "0 - 0";
    var rank = "1 of 4";
    const { name } = req.body;
    let errors = [];

    if (!name) {
        errors.push({ msg: 'Please enter a team name' });
    }
    if (errors.length > 0) {
        res.render('new-team', {
            errors,
            name,
        });
    } else {
        const newTeam = new Team({
            owner,
            email,
            name,
            league,
            record,
            rank
        });

        var tooManyTeams = false;

        // check numTeams for current league
        League.findOne({ name: league }, function(err, leagueData) {
            if (leagueData.numTeams < 10) {
                leagueData.numTeams++;
                leagueData.save(function(err) {
                    if (err) { console.log(err) }
                });
            } else {
                tooManyTeams = true;
            }
        });

        if (!tooManyTeams) {
            newTeam
                .save()
                .then(team => {
                    res.redirect('/dashboard');
                })
                .catch(err => console.log(err));
        }
    }
});

// LEAGUE START
router.get('/start', ensureAuthenticated, (req, res) => {
    League.findOneAndUpdate({name: req.session.currLeague}, {$set:{active: true}}, (err, doc) => {
        if (err) { console.log(err) }

        res.redirect('/league');
    });
});

// ENTER DRAFT RESULTS
router.get('/enter-results', ensureAuthenticated, (req, res) => {
    Team.find({league: req.session.currLeague}, (err, teams) => {
        res.render('draft-form', {
            teams: teams
        });
    });
});

module.exports = router;
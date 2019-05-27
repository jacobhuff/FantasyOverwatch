const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
// Load League model
const League = require('../models/League');
const Team = require('../models/Team');
const mailer = require('../config/mailer');
const setAvailable = require('../api/setAvailable.js');
const initializeLeague = require('../routes/initializeLeague.js');

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
            isActive: league.active,
            hasDrafted: league.hasDrafted
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
    // set available players for league
    setAvailable(req.session.currLeague);

    // set the starting stage for the league and create the league schedule
    initializeLeague(req.session.currLeague, new Date().getTime());

    // set league to active
    League.findOneAndUpdate({name: req.session.currLeague}, {$set:{active: true}}, (err, doc) => {
        if (err) { console.log(err) }

        res.redirect('/league');
    });
});

// ENTER DRAFT RESULTS
router.get('/enter-results', ensureAuthenticated, (req, res) => {
    
    Team.find({league: req.session.currLeague}, (err, teams) => {
        League.findOne({name: req.session.currLeague}, (err, league) => {
            availablePlayers = league.availablePlayers;
            var owlTeams = {};
            availablePlayers.forEach((player) => {
                var playerName = player[0];
                var playerTeam = player[1];
                if (owlTeams[playerTeam]) {
                    owlTeams[playerTeam].push(playerName);
                } else {
                    owlTeams[playerTeam] = [playerName];
                }
            });
            res.render('draft-form', {
                teams: teams,
                owlTeams: owlTeams
            });
        });
    });
    
});

router.post("/enter-results", (req, res) => {
    req.session.currPlayer = req.body["player-button"];
    res.redirect('/league/enter-results/team');
});

router.get('/enter-results/team', ensureAuthenticated, (req, res) => {
    Team.find({league: req.session.currLeague}, (err, teams) => {
        var eligibleTeams = [];
        teams.forEach((team) => {
            if (team.players.length < 20) {
                eligibleTeams.push(team.name);
            }
        });
        res.render('choose-team', {
            teams: eligibleTeams,
            player: req.session.currPlayer
        });
    });
});

router.post('/enter-results/choose-team', (req, res) => {
    req.session.currTeam = req.body["choose-team-button"];
    var index = 0;
    var indexToRemove;

    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        league.availablePlayers.forEach((player) => {
            if (player[0] === req.session.currPlayer) {
                // this is the index we need to remove from availablePlayers
                League.findOneAndUpdate({name: req.session.currLeague}, {$pull:{availablePlayers: availablePlayers[index]}}, (err, doc) => {
                    console.log("Pulled from free agents: " + req.session.currPlayer);
                    if (err) { console.log(err) }
                });
            }
            index++;
        });
    });

    Team.findOneAndUpdate({league: req.session.currLeague, name: req.session.currTeam}, {$push: {players: req.session.currPlayer}}, (err, doc) => {
        if (err) { console.log(err) }
        console.log("Pushed to team: " + req.session.currPlayer);
        res.redirect("/league/enter-results");
    });
});

router.post('/enter-results/submit', (req, res) => {
    // draft has been entered, league can be started

    // send user back to updated league dashboard
    res.redirect('/league/submit');
});
router.get('/submit', ensureAuthenticated, (req, res) => {
    League.findOneAndUpdate({name: req.session.currLeague}, {$set:{hasDrafted: true}}, (err, doc) => {
        if (err) { console.log(err) }
    });
    League.findOne({name: req.session.currLeague}).then(league => {
        var isOwner = false;
        if (league.administrator === req.user.name) {
            // current user is owner of league
            isOwner = true;
        }
        res.render('league', {
            numTeams: league.numTeams,
            isOwner: isOwner,
            isActive: league.active,
            hasDrafted: league.hasDrafted
        });
    });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
// Load League model
const League = require('../models/League');
const Team = require('../models/Team');
const owlSchedule = require('../models/owlSchedule.js');
const mailer = require('../config/mailer');
const setAvailable = require('../api/setAvailable.js');
const initializeLeague = require('../api/initializeLeague.js');
const getCurrentWeek = require('../api/getCurrentWeek.js');
const getPlayerStats = require('../api/getPlayerStats.js');

/* LEAGUE DASH */
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
/* END LEAGUE DASH */

/* LEAGUE INVITES */
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
/* END LEAGUE INVITES */

/* CREATE TEAM */
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
            if (leagueData.numTeams < 8) {
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
/* END CREATE TEAM */

/* LEAGUE INITIATION */
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
/* END LEAGUE INITIATION */

/* DRAFT FORM */
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
            if (team.players.length < 15) {
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

    Team.findOneAndUpdate({league: req.session.currLeague, name: req.session.currTeam}, {$push: {players: [req.session.currPlayer]}}, (err, doc) => {
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
/* END DRAFT FORM */

/* SCHEDULE */
router.get('/schedule', ensureAuthenticated, (req, res) => {
    League.findOne({name: req.session.currLeague}, (err, league) => {
        // get league's current week
        getCurrentWeek(league.startingStage, new Date().getTime(), res, req, handleReroute);
    });
});
function handleReroute(currWeek, res, req) {
    // get matchups for current week from League
    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        let matches;
        for (let i = 0; i < league.schedule.length; i++) {
            if (currWeek - 1 === i) {
                matches = league.schedule[i];
            }
        }
        res.render('schedule', {
            matches: matches,
            currWeek: currWeek,
            numWeeks: league.schedule.length
        });
    });
}
router.post('/schedule', (req, res) => {
    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        let matches;
        let currWeek = req.body.selectedWeek;

        for (let i = 0; i < league.schedule.length; i++) {
            if (currWeek - 1 === i) {
                matches = league.schedule[i];
            }
        }
        res.render('schedule', {
            matches: matches,
            currWeek: currWeek,
            numWeeks: league.schedule.length
        });
    });
});
/* END SCHEDULE */

/* MY TEAM */
router.get('/team', ensureAuthenticated, (req, res) => {
    var starter;
    var bench;
    var isChanging = false;
    if (req.query.starter) {
        starter = req.query.starter;
    }
    if (req.query.bench) {
        bench = req.query.bench;
    }
    if (req.query.isChanging) {
        isChanging  = true;
    }
    Team.findOne({league: req.session.currLeague, email: req.user.email}, (err, team) => {
        res.render('myteam', {
            starter: starter,
            bench: bench,
            isChanging: isChanging,
            players: team.players
        });
    });
});
router.post('/team/starter', (req, res) => {
    req.session.selectedStarter = req.body.selectedPlayer;
    res.redirect('/league/team?starter=' + req.body.selectedPlayer + "&isChanging=true");
});
router.post('/team/bench', (req, res) => {
    req.session.selectedBench = req.body.selectedPlayer;
    res.redirect('/league/team?bench=' + req.body.selectedPlayer + "&isChanging=true");
});
router.post('/team/changing', (req, res) => {
    if (req.session.selectedStarter) {
        req.session.selectedBench = req.body.selectedPlayer;
    } else if (req.session.selectedBench) {
        req.session.selectedStarter = req.body.selectedPlayer;
    }
    Team.findOne({league: req.session.currLeague, email: req.user.email}, (err, team) => {
        players = team.players;
        var temp;
        var tempIndex;
        for (let i = 0; i < players.length; i++) {
            if (players[i] === req.session.selectedStarter) {
                temp = players[i];
                tempIndex = i;
            }
        }
        for (let i = 0; i < players.length; i++) {
            if (players[i] === req.session.selectedBench) {
                players[tempIndex] = players[i];
                players[i] = temp;
            }
        }
        Team.findOneAndUpdate({league: req.session.currLeague, email: req.user.email}, {$set: {players: players}}, (err, doc) => {
            if (err) { console.log(err) }
            req.session.selectedStarter = null;
            req.session.selectedBench = null;
            res.redirect('/league/team');
        });
    });
});
/* END MY TEAM */

/* MATCHUP */
router.get('/matchup', ensureAuthenticated, (req, res) => {
    League.findOne({name: req.session.currLeague}, (err, league) => {
        // get league's current week
        getCurrentWeek(league.startingStage, new Date().getTime(), res, req, handleMatchups);
    });
});
function handleMatchups(currWeek, res, req) {

    console.log("Current Week: " + currWeek);

    // get matchups for current week from League    
    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        let matches;
        for (let i = 0; i < league.schedule.length; i++) {
            if (currWeek - 1 === i) {
                matches = league.schedule[i];
            }
        }
        Team.findOne({league: req.session.currLeague, email: req.user.email}, (err, yourTeam) => {
            if (err) { console.log(err) }
            var theirTeamName;
            for (let i = 0; i < matches.length; i++) {
                if (matches[i][0] === yourTeam.name) {
                    theirTeamName = matches[i][1];
                } else if (matches[i][1] === yourTeam.name) {
                    theirTeamName = matches[i][0];
                }
            }
            owlSchedule.findOne({}, (err, schedule) => {
                Team.findOne({league: req.session.currLeague, name: theirTeamName}, (err, theirTeam) => {
                    let allPlayers = yourTeam.players.concat(theirTeam.players);
                    let currOwlStage = schedule.currentStage;
                    let currOwlWeek = schedule.currentWeek;
                    if (currWeek == 1) {
                        // league has not started yet
                        //console.log("Your League has not started yet");
                        currOwlStage = 2;
                        currOwlWeek = 3;
                    } else {
                        if (currOwlWeek == 1) {
                            if (currOwlStage == 1) {
                                // Overwatch league has not started yet
                                console.log("Overwatch League has not started yet");
                            } else {
                                currOwlWeek = 4;
                                currOwlStage -= 1;
                            }
                        } else {
                            currOwlWeek -= 1;
                        }
                    }
                    getPlayerStats(allPlayers, yourTeam, theirTeam, currOwlStage, currOwlWeek, res, req, rerouteMatchups);
                });
            });
        });
    });
}

function rerouteMatchups(playerData, yourTeam, theirTeam, res) {
    let yourPlayers = yourTeam.players;
    let theirPlayers = theirTeam.players;
    let yourData = [];
    let theirData = [];

    for (let f = 0; f < yourTeam.players.length; f++) {
        for (let g = 0; g < playerData.length; g++) {
            if (yourTeam.players[f] == playerData[g].name) {
                yourData.push(playerData[g]);
                break;
            }
        }
    }
    for (let i = 0; i < theirTeam.players.length; i++) {
        for (let q = 0; q < playerData.length; q++) {
            if (theirTeam.players[i] == playerData[q].name) {
                theirData.push(playerData[q]);
                break;
            }
        }
    }

    let points = 0.0;
    for (let j = 0; j < yourData.length; j++) {
        if (yourData[j].damage) {
            yourData[j].damage = Math.round(yourData[j].damage * 10.0 / 10000) / 10;
            points = Math.round((points + yourData[j].damage) * 1e12) / 1e12;
        }
        if (yourData[j].eliminations) {
            yourData[j].eliminations = Math.round(yourData[j].eliminations * 10.0 / 15) / 10;
            points = Math.round((points + yourData[j].eliminations) * 1e12) / 1e12;
        }
        if (yourData[j].healing) {
            yourData[j].healing = Math.round(yourData[j].healing * 10.0 / 10000) / 10;
            points = Math.round((points + yourData[j].healing) * 1e12) / 1e12;
        }
        yourData[j]["points"] = points;
        points = 0.0;
    }
    for (let k = 0; k < theirData.length; k++) {
        if (theirData[k].damage) {
            theirData[k].damage = Math.round(theirData[k].damage * 10.0 / 10000) / 10;
            points = Math.round((points + theirData[k].damage) * 1e12) / 1e12;
        }
        if (theirData[k].eliminations) {
            theirData[k].eliminations = Math.round(theirData[k].eliminations * 10.0 / 15) / 10;
            points = Math.round((points + theirData[k].eliminations) * 1e12) / 1e12;
        }
        if (theirData[k].healing) {
            theirData[k].healing = Math.round(theirData[k].healing * 10.0 / 10000) / 10;
            points = Math.round((points + theirData[k].healing) * 1e12) / 1e12;
        }
        theirData[k]["points"] = points;
        points = 0.0;
    }

    res.render('matchup', {
        yourTeam: yourTeam,
        theirTeam: theirTeam,
        yourPlayers: yourData,
        theirPlayers: theirData
    });
}
/* END MATCHUP */
module.exports = router;
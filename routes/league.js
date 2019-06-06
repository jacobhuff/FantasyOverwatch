const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
// Load League model
const League = require('../models/League');
const Team = require('../models/Team');
const owlSchedule = require('../models/owlSchedule.js');
const Player = require('../models/Player.js');
const mailer = require('../config/mailer');
const setAvailable = require('../api/setAvailable.js');
const initializeLeague = require('../api/initializeLeague.js');
const getCurrentWeek = require('../api/getCurrentWeek.js');
const getPlayerStats = require('../api/getPlayerStats.js');
const updateResults = require('../api/updateResults.js');

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
    owlSchedule.find({}, (err, schedule) => {
        var currOwlStage = schedule[0].currentStage;
        var currOwlWeek = schedule[0].currentWeek;
        League.findOne({name: req.session.currLeague}, (err, league) => {
            // get league's current week
            if (league.hasDrafted) {
                let startingStage = league.startingStage;
                let currWeek = (currOwlStage - startingStage) * 4 + currOwlWeek;
                updateResults(currWeek, res, req);
            } else {
                res.redirect('league');
            }
        });
    });
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

    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        league.availablePlayers.forEach((player) => {
            if (player[0] === req.session.currPlayer) {
                // this is the index we need to remove from availablePlayers
                League.findOneAndUpdate({name: req.session.currLeague}, {$pull:{availablePlayers: availablePlayers[index]}}, (err, doc) => {
                    if (err) { console.log(err) }
                });
            }
            index++;
        });
    });

    Team.findOneAndUpdate({league: req.session.currLeague, name: req.session.currTeam}, {$push: {players: [req.session.currPlayer]}}, (err, doc) => {
        if (err) { console.log(err) }
        res.redirect("/league/enter-results");
    });
});
router.post('/enter-results/submit', (req, res) => {
    // draft has been entered, league can be started
    // Initialize lineups for all weeks
    League.findOne({name: req.session.currLeague}, (err, league) => {
        var startingStage = league.startingStage;
        var numWeeks = (5 - startingStage) * 4;

        Team.find({league: req.session.currLeague}, (err, teams) => {
            for (let k = 0; k < teams.length; k++) {
                // initalize lineups array
                var lineups = [];
                for (let j = 1; j < numWeeks + 1; j++) {
                    let obj = {};
                    obj["week"] = j;
                    obj["lineup"] = teams[k].players;
                    lineups.push(obj);
                }
                Team.findOneAndUpdate({league: req.session.currLeague, name: teams[k].name}, {$set: {lineups: lineups}}, (err, doc) => {
                    if (err) { console.log(err) }
                });
            }
        });
    });
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
    Player.find({}, (err, players) => {
        owlSchedule.find({}, (err, schedule) => {
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

            // GET CURRENT OWL DATES
            var startDate;
            var endDate;
            schedule[0].weeks.forEach((week) => {
                if (week[0] == schedule[0].currentStage && week[1] == schedule[0].currentWeek) {
                    startDate = new Date(week[2]);
                    endDate = new Date(week[3]);
                }
            });
            var monthNames = [
                "January", "February", "March",
                "April", "May", "June", "July",
                "August", "September", "October",
                "November", "December"
            ];
            var dayNames = [
                "Sunday", "Monday", "Tuesday",
                "Wednesday", "Thursday", "Friday",
                "Saturday"
            ];

            // SET START TIME
            let startDayofMonth = startDate.getDate();
            let startMonth = monthNames[startDate.getMonth()];
            let startDayofWeek = dayNames[startDate.getDay()];
            let startArray = convertHour(startDate.getHours());
            let startHour = startArray[0];
            let startMinutes = startDate.getMinutes();
            if (startMinutes == '0') {
                startMinutes = '00';
            }
            let startTime = startDayofWeek + ', ' + startMonth + ' ' + startDayofMonth + ', ' + startHour + ':' + startMinutes + startArray[1];

            // SET END TIME
            let endDayofMonth = endDate.getDate();
            let endMonth = monthNames[endDate.getMonth()];
            let endDayofWeek = dayNames[endDate.getDay()];
            let endArray = convertHour(endDate.getHours());
            let endHour = endArray[0];
            let endMinutes = endDate.getMinutes();
            if (endMinutes == '0') {
                endMinutes = '00';
            }
            let endTime = endDayofWeek + ', ' + endMonth + ' ' + endDayofMonth + ', ' + endHour + ':' + endMinutes + endArray[1];

            // ADD TEAMS TO PLAYERS ARRAY
            Team.findOne({league: req.session.currLeague, email: req.user.email}, (err, team) => {
                var playersArray = [];
                players.forEach((player) => {
                    if (team.players.includes(player.name)) {
                        let arrToPush = [];
                        arrToPush.push(player.name);
                        arrToPush.push(player.team);
                        playersArray.push(arrToPush);
                    }
                });

            
                res.render('myteam', {
                    starter: starter,
                    bench: bench,
                    isChanging: isChanging,
                    players: playersArray,
                    startTime: startTime,
                    endTime: endTime
                });
            });
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
        for (let j = 0; j < players.length; j++) {
            if (players[j] === req.session.selectedBench) {
                players[tempIndex] = players[j];
                players[j] = temp;
            }
        }
        Team.findOneAndUpdate({league: req.session.currLeague, email: req.user.email}, {$set: {players: players}}, (err, doc) => {
            if (err) { console.log(err) }
            req.session.selectedStarter = null;
            req.session.selectedBench = null;
            owlSchedule.find({}, (err, schedule) => {
                var currOwlStage = schedule[0].currentStage;
                var currOwlWeek = schedule[0].currentWeek;
                League.findOne({name: req.session.currLeague}, (err, league) => {
                    // get league's current week
                    let startingStage = league.startingStage;
                    let currWeek = (currOwlStage - startingStage) * 4 + currOwlWeek;
                    updateLineups(currWeek, res, req);
                });
            });
        });
    });
});
function updateLineups(currWeek, res, req) {
    Team.findOne({league: req.session.currLeague, email: req.user.email}, (err, team) => {
        var lineups = team.lineups;
        lineups.forEach((obj) => {
            if (obj.week >= currWeek) {
                obj.lineup = team.players;
            }
        });

        Team.findOneAndUpdate({league: req.session.currLeague, email: req.user.email}, {$set: {lineups: lineups}}, (err, doc) => {
            if (err) { console.log(err) }

            res.redirect('/league/team');
        });
    });
}
/* END MY TEAM */

/* MATCHUP */
router.get('/matchup', ensureAuthenticated, (req, res) => {
    owlSchedule.find({}, (err, schedule) => {
        var currOwlStage = schedule[0].currentStage;
        var currOwlWeek = schedule[0].currentWeek;
        League.findOne({name: req.session.currLeague}, (err, league) => {
            // get league's current week
            let startingStage = league.startingStage;
            let currWeek = (currOwlStage - startingStage) * 4 + currOwlWeek;
            handleMatchups(currWeek, res, req);
        });
    });
});
function handleMatchups(selectedWeek, res, req) {
    // get matchups for current week from League    
    League.findOne({name: req.session.currLeague}, (err, league) => {
        if (err) { console.log(err) }

        var matches;
        for (let i = 0; i < league.schedule.length; i++) {
            if (selectedWeek - 1 === i) {
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
            Team.findOne({league: req.session.currLeague, name: theirTeamName}, (err, theirTeam) => {
                let allPlayers = yourTeam.players.splice(0,9).concat(theirTeam.players.splice(0,9));
                let stageToUpdate = league.startingStage;
                let weekToUpdate = selectedWeek;
                while (weekToUpdate > 4) {
                    stageToUpdate++;
                    weekToUpdate -= 4;
                }
                getPlayerStats(allPlayers, yourTeam.name, theirTeam.name, stageToUpdate, weekToUpdate, selectedWeek, res, req, rerouteMatchups);
            });
        });
    });
}

function rerouteMatchups(playerData, yourTeamName, theirTeamName, currWeek, stageToUpdate, weekToUpdate, res, req) {
    owlSchedule.find({}, (err, schedule) => {
        League.findOne({name: req.session.currLeague}, (err, league) => {
            Team.findOne({league: req.session.currLeague, name: yourTeamName}, (err, yourTeam) => {
                Team.findOne({league: req.session.currLeague, name: theirTeamName}, (err, theirTeam) => {
                    // get timeframe for current owl week
                    var startDate;
                    var endDate;
                    schedule[0].weeks.forEach((week) => {
                        if (week[0] == stageToUpdate && week[1] == weekToUpdate) {
                            startDate = new Date(week[2]);
                            endDate = new Date(week[3]);
                        }
                    });
                    var monthNames = [
                        "January", "February", "March",
                        "April", "May", "June", "July",
                        "August", "September", "October",
                        "November", "December"
                    ];
                    var dayNames = [
                        "Sunday", "Monday", "Tuesday",
                        "Wednesday", "Thursday", "Friday",
                        "Saturday"
                    ];

                    // SET START TIME
                    let startDayofMonth = startDate.getDate();
                    let startMonth = monthNames[startDate.getMonth()];
                    let startDayofWeek = dayNames[startDate.getDay()];
                    let startArray = convertHour(startDate.getHours());
                    let startHour = startArray[0];
                    let startMinutes = startDate.getMinutes().toString();
                    if (startMinutes.length == 1) {
                        startMinutes += '0';
                    }
                    let startTime = startDayofWeek + ', ' + startMonth + ' ' + startDayofMonth + ', ' + startHour + ':' + startMinutes + startArray[1];

                    // SET END TIME
                    let endDayofMonth = endDate.getDate();
                    let endMonth = monthNames[endDate.getMonth()];
                    let endDayofWeek = dayNames[endDate.getDay()];
                    let endArray = convertHour(endDate.getHours());
                    let endHour = endArray[0];
                    let endMinutes = endDate.getMinutes().toString();
                    if (endMinutes.length == 1) {
                        endMinutes += '0';
                    }
                    let endTime = endDayofWeek + ', ' + endMonth + ' ' + endDayofMonth + ', ' + endHour + ':' + endMinutes + endArray[1];

                    // CHECK IF DATA EXISTS
                    if (playerData.length == 0 || playerData === undefined) {
                        return res.render('matchup', {
                            yourTeam: yourTeam,
                            theirTeam: theirTeam,
                            yourPlayers: [],
                            theirPlayers: [],
                            startTime: startTime,
                            endTime: endTime,
                            currWeek: currWeek,
                            numWeeks: league.schedule.length
                        });
                    }

                    let yourData = [];
                    let theirData = [];
                    for (let f = 0; f < yourTeam.players.length; f++) {
                        let playerFound = false;
                        for (let g = 0; g < playerData.length; g++) {
                            if (yourTeam.players[f] == playerData[g].name) {
                                playerFound = true;
                                yourData.push(playerData[g]);
                                break;
                            }
                        }
                        if (f < 9 && !playerFound) {
                            theirData.push({"name": yourTeam.players[f]})
                        }
                    }
                    for (let i = 0; i < theirTeam.players.length; i++) {
                        playerFound = false;
                        for (let q = 0; q < playerData.length; q++) {
                            if (theirTeam.players[i] == playerData[q].name) {
                                playerFound = true;
                                theirData.push(playerData[q]);
                                break;
                            }
                        }
                        if (i < 9 && !playerFound) {
                            theirData.push({"name": theirTeam.players[i]})
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
                    
                    let yourTotalDamage = 0.0;
                    let yourTotalElims = 0.0;
                    let yourTotalHealing = 0.0;
                    let yourTotalPoints = 0.0;
                    let theirTotalDamage = 0.0;
                    let theirTotalElims = 0.0;
                    let theirTotalHealing = 0.0;
                    let theirTotalPoints = 0.0;

                    for (let z = 0; z < yourData.length; z++) {
                        if (yourData[z].damage) {
                            yourTotalDamage = Math.round((yourTotalDamage + yourData[z].damage) * 1e12) / 1e12;
                        }
                        if (yourData[z].eliminations) {                        
                            yourTotalElims = Math.round((yourTotalElims + yourData[z].eliminations) * 1e12) / 1e12;
                        }   
                        if (yourData[z].healing) {
                            yourTotalHealing = Math.round((yourTotalHealing + yourData[z].healing) * 1e12) / 1e12;
                        }   
                        if (yourData[z].points) {
                            yourTotalPoints = Math.round((yourTotalPoints + yourData[z].points) * 1e12) / 1e12;
                        }
                    }
                    for (let x = 0; x < theirData.length; x++) {
                        if (theirData[x].damage) {
                            theirTotalDamage = Math.round((theirTotalDamage + theirData[x].damage) * 1e12) / 1e12;
                        }
                        if (theirData[x].eliminations) {
                            theirTotalElims = Math.round((theirTotalElims + theirData[x].eliminations) * 1e12) / 1e12;
                        }   
                        if (theirData[x].healing) {
                            theirTotalHealing = Math.round((theirTotalHealing + theirData[x].healing) * 1e12) / 1e12;
                        }   
                        if (theirData[x].points) {
                            theirTotalPoints = Math.round((theirTotalPoints + theirData[x].points) * 1e12) / 1e12;
                        }
                    }

                    yourData["totalDamage"] = yourTotalDamage;
                    yourData["totalElims"] = yourTotalElims;
                    yourData["totalHealing"] = yourTotalHealing;
                    yourData["totalPoints"] = yourTotalPoints;
                    theirData["totalDamage"] = theirTotalDamage;
                    theirData["totalElims"] = theirTotalElims;
                    theirData["totalHealing"] = theirTotalHealing;
                    theirData["totalPoints"] = theirTotalPoints;

                    res.render('matchup', {
                        yourTeam: yourTeam,
                        theirTeam: theirTeam,
                        yourPlayers: yourData,
                        theirPlayers: theirData,
                        startTime: startTime,
                        endTime: endTime,
                        currWeek: currWeek,
                        numWeeks: league.schedule.length
                    });
                });
            });
        });
    });
}
function convertHour(time) {
    let hour = parseInt(time, 10);
    if (hour == 0) {
        return ['12', 'AM'];
    } else if (hour > 0 && hour < 12) {
        return [hour.toString(), 'AM'];
    } else if (hour == 12) {
        return [hour.toString(), 'PM'];
    } else {
        return [(hour - 12).toString(), 'PM'];
    }
}
router.post('/matchup', (req, res) => {
    let selectedWeek = req.body.selectedWeek;
    handleMatchups(selectedWeek, res, req);
});
/* END MATCHUP */

/* STANDINGS */
router.get('/standings', ensureAuthenticated, (req, res) => {
    owlSchedule.find({}, (err, schedule) => {
        var currOwlStage = schedule[0].currentStage;
        var currOwlWeek = schedule[0].currentWeek;
        League.findOne({name: req.session.currLeague}, (err, league) => {
            // get league's current week
            let startingStage = league.startingStage;
            var currWeek = (currOwlStage - startingStage) * 4 + currOwlWeek;
            
            Team.find({league: req.session.currLeague}, (err, teams) => {
                if (currWeek == 1) {
                    // don't display standings
                } else {
                    // rank, name, record, for, against
                    let teamStats = [];
                    for (let i = 0; i < teams.length; i++) {
                        let team = teams[i];
                        let rank = team.rank;
                        let name = team.name;
                        let record = team.record;
                        let pointsFor = team.pointsFor;
                        let pointsAgainst = team.pointsAgainst;
                        let obj = {
                            "rank": rank,
                            "name": name,
                            "record": record,
                            "pointsFor": pointsFor,
                            "pointsAgainst": pointsAgainst
                        };
                        teamStats.push(obj);
                    }
                    for (let j = 0; j < teamStats.length; j++) {
                        for (let k = 0; k < teamStats.length; k++) {
                            if (teamStats[j].rank < teamStats[k].rank) {
                                // switch items
                                let tempItem = teamStats[j];
                                teamStats[j] = teamStats[k];
                                teamStats[k] = tempItem;
                            }
                        }
                    }
                    return res.render('standings', {
                        teamStats: teamStats
                    });
                }
            });
        });
    });
});
/* END STANDINGS */
module.exports = router;
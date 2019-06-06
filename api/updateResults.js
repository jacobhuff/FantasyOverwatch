var League = require('../models/League.js');
var Team = require('../models/Team.js');
var Stats = require('../models/Stats.js');
var owlSchedule = require('../models/owlSchedule.js');

module.exports = function updateResults(currWeek, res, req) {
    if (currWeek == 1) {
        // results cannot be updated yet - return
        return res.redirect('league/team');
    } else {
        runUpdateInOrder(currWeek, res, req, function() {
            return res.redirect('league/team');
        });
    }
};

function runUpdateInOrder(currWeek, res, req, callback) {
    firstFunction(currWeek, res, req, function(weeksToUpdate, league, teams) {
        secondFunction(weeksToUpdate, league, teams, function(teamsToUpdate, stageToUpdate) {
            thirdFunction(teamsToUpdate, stageToUpdate, function(teamsToUpdate) {
                fourthFunction(teamsToUpdate, req, function() {
                    fifthFunction(res, req, callback);
                });
            });
        });
    });
}

function firstFunction(currWeek, res, req, callback) {
    // do something
    Team.find({league: req.session.currLeague}, (err, teams) => {
        League.findOne({name: req.session.currLeague}, (err, league) => {
            if (league.results.length != currWeek - 1) {
                let lastUpdatedWeek = league.results.length;
                let weekToUpdate = currWeek - 1;
                let weeksToUpdate = [];
                for (let t = lastUpdatedWeek + 1; t < weekToUpdate + 1; t++) {
                    weeksToUpdate.push(t);
                    //updateWeeksCallback(league, teams, t, getTotalPoints);
                }

                // callback
                callback(weeksToUpdate, league, teams);
                //updateRecordsCallback(res, req);
            } else {
                // array is up to date - return
                return res.redirect('league/team');
            }
        });
    });
}

function secondFunction(weeksToUpdate, league, teams, callback) {
    // do something
    let teamsToUpdate = [];
    for (let t = weeksToUpdate[0]; t < weeksToUpdate.length + 1; t++) {
        var schedule = league.schedule[t - 1];
        let obj = {};
        obj["week"] = t;
        let matches = [];
        for (let i = 0; i < schedule.length; i++) {
            let currMatch = {}
            currMatch["team1"] = schedule[i][0];
            currMatch["team2"] = schedule[i][1];

            // get lineups, weeks, and teams to update and store in teamsToUpdate
            for (let j = 0; j < teams.length; j++) {
                if (teams[j].name == schedule[i][0]) {
                    for (let k = 0; k < teams[j].lineups.length; k++) {
                        if (teams[j].lineups[k].week == t) {
                            var team1lineup = teams[j].lineups[k].lineup;
                        }
                    }
                } else if (teams[j].name == schedule[i][1]) {
                    for (let k = 0; k < teams[j].lineups.length; k++) {
                        if (teams[j].lineups[k].week == t) {
                            var team2lineup = teams[j].lineups[k].lineup;
                        }
                    }
                }
            }
            currMatch["team1lineup"] = team1lineup;
            currMatch["team2lineup"] = team2lineup;
            matches.push(currMatch);
        }
        obj["matches"] = matches;
        teamsToUpdate.push(obj);
    }

    // callback
    callback(teamsToUpdate, league.startingStage);
}

function thirdFunction(teamsToUpdate, stageToUpdate, callback) {
    // do something
    Stats.find({}, (err, stats) => {

        var stats = stats[0];

        for (let i = 0; i < teamsToUpdate.length; i++) {
            let currWeek = teamsToUpdate[i].week;
            let currMatches = teamsToUpdate[i].matches;
            while (currWeek > 4) {
                stageToUpdate++;
                currWeek -= 4;
            }
            for (let j = 0; j < currMatches.length; j++) {
                // get starters from each lineup
                let team1starters = currMatches[j].team1lineup.splice(0, 9);
                let team2starters = currMatches[j].team2lineup.splice(0, 9);
                // get points for each lineup
                var team1points = 0.0;
                var team2points = 0.0;
                stats.stats.forEach((stat) => {
                    if (team1starters.includes(stat.playerName)) {
                        var playerName = stat.playerName;
                        stat.stats.forEach((playerStat) => {
                            // get stage and week of week you are trying to get stats for
                            if (stageToUpdate == playerStat.stage && playerStat.week == currWeek) {
                                // stats exist for that player for that stage and week
                                var playerPoints = 0.0;
                                playerStat.playerStats.forEach((gameStat) => {
                                    let value = gameStat.value;
                                    if (gameStat.name == "damage") {
                                        value = Math.round(value * 10.0 / 10000) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                    if (gameStat.name == "eliminations") {
                                        value = Math.round(value * 10.0 / 15) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                    if (gameStat.name == "healing") {
                                        value = Math.round(value * 10.0 / 10000) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                });
                                team1points = Math.round((team1points + playerPoints) * 1e12) / 1e12;
                            }
                        });
                    } else if (team2starters.includes(stat.playerName)) {
                        stat.stats.forEach((playerStat) => {
                            // get stage and week of week you are trying to get stats for
                            if (stageToUpdate == playerStat.stage && playerStat.week == currWeek) {
                                // stats exist for that player for that stage and week
                                var playerPoints = 0.0;
                                playerStat.playerStats.forEach((gameStat) => {
                                    let value = gameStat.value;
                                    if (gameStat.name == "damage") {
                                        value = Math.round(value * 10.0 / 10000) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                    if (gameStat.name == "eliminations") {
                                        value = Math.round(value * 10.0 / 15) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                    if (gameStat.name == "healing") {
                                        value = Math.round(value * 10.0 / 10000) / 10;
                                        playerPoints = Math.round((playerPoints + value) * 1e12) / 1e12;
                                    }
                                });
                                team2points = Math.round((team2points + playerPoints) * 1e12) / 1e12;
                            }
                        });
                    }
                });
                // add team 1 and team 2 points to array and delete lineups for that match
                delete teamsToUpdate[i].matches[j]["team1lineup"];
                delete teamsToUpdate[i].matches[j]["team2lineup"];
                teamsToUpdate[i].matches[j]["team1points"] = team1points;
                teamsToUpdate[i].matches[j]["team2points"] = team2points;
            }
        }

        // callback
        callback(teamsToUpdate);
    }); 
}

function fourthFunction(teamsToUpdate, req, callback) {
    // do something
    League.findOneAndUpdate({name: req.session.currLeague}, {$set: {results: teamsToUpdate}}, (err, doc) => {
        if (err) {console.log(err)}
    });

    // callback
    callback();
}

function fifthFunction(res, req, callback) {
    Team.find({league: req.session.currLeague}, (err, teams) => {  
        League.findOne({name: req.session.currLeague}, (err, league) => {
            let results = league.results;
            let alreadyAdded = [];
            let data = [];
            for (let i = 0; i < results.length; i++) {
                for (let j = 0; j < results[i].matches.length; j++) {
                    let match = results[i].matches[j];
                    let team1 = match.team1;
                    let team1points = match.team1points;
                    let team2 = match.team2;
                    let team2points = match.team2points;
                    if (!alreadyAdded.includes(team1)) {
                        alreadyAdded.push(team1);
                        let obj = {
                            "team": team1,
                            "wins": 0, 
                            "losses": 0,
                            "pointsFor": 0.0,
                            "pointsAgainst": 0.0
                        };
                        data.push(obj);
                    }
                    if (!alreadyAdded.includes(team2)) {
                        alreadyAdded.push(team2);
                        let obj = {
                            "team": team2,
                            "wins": 0, 
                            "losses": 0,
                            "pointsFor": 0.0,
                            "pointsAgainst": 0.0
                        };
                        data.push(obj);
                    }
                    data.forEach((item) => {
                        if (team1 == item.team) {
                            let newPointsFor = item.pointsFor + team1points;
                            newPointsFor = parseFloat(newPointsFor.toFixed(1));
                            item.pointsFor = newPointsFor;
                            let newPointsAgainst = item.pointsAgainst + team2points;
                            newPointsAgainst = parseFloat(newPointsAgainst.toFixed(1));
                            item.pointsAgainst += team2points;
                            if (team1points > team2points) {
                                item.wins += 1;
                            } else {
                                item.losses += 1;
                            }
                        }
                        if (team2 == item.team) {
                            let newPointsFor = item.pointsFor + team2points;
                            newPointsFor = parseFloat(newPointsFor.toFixed(1));
                            item.pointsFor = newPointsFor;
                            let newPointsAgainst = item.pointsAgainst + team1points;
                            newPointsAgainst = parseFloat(newPointsAgainst.toFixed(1));
                            item.pointsAgainst = newPointsAgainst;
                            if (team2points > team1points) {
                                item.wins += 1;
                            } else {
                                item.losses += 1;
                            }
                        }
                    });
                }
            }
            // loop through each team and update record, points for & against, and rank based on 'data' array
            console.log("Data before sorting: " + JSON.stringify(data));
            if (data.length === 0 || data == undefined) {
                // no games have been played yet for this league
            } else {
                for (let g = 0; g < data.length; g++) {
                    for (let h = 0; h < data.length; h++) {
                        if (data[g].wins > data[h].wins) {
                            let tempItem = data[g];
                            data[g] = data[h];
                            data[h] = tempItem;
                        } else if (data[g].wins == data[h].wins) {
                            if (data[g].pointsFor > data[h].pointsFor) {
                                let tempItem = data[g];
                                data[g] = data[h];
                                data[h] = tempItem;
                            }
                        }
                    }
                }
                console.log("Data AFTER sorting: " + JSON.stringify(data));
                let currRank = 1;
                for (let k = 0; k < data.length; k++) {
                    let item = data[k];
                    let record = item.wins + " - " + item.losses;
                    Team.findOneAndUpdate({league: req.session.currLeague, name: item.team},
                        {$set: {record: record, pointsFor: item.pointsFor, pointsAgainst: item.pointsAgainst, rank: currRank}}, (err, doc) => {
                        if (err) { console.log(err) }
                    });
                    currRank++;
                }
            }

            // callback
            callback();
        });
    });
}
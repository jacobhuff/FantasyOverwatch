const request = require('request');
const Stats = require('../models/Stats.js');

module.exports = async function updatePlayerStats(matchIds, players, newUpdatedStage, newUpdatedWeek) {
    Stats.find({}, (err, stats) => {
        var playerStats = stats[0].stats;
        const urls = getUrls(matchIds);
        makeRequests(urls, players, playerStats, newUpdatedStage, newUpdatedWeek, makeRequests);
    });
}

function makeRequests(urls, players, playerStats, newUpdatedStage, newUpdatedWeek, callback) {
    if (urls.length !== 0) {
        let urlItem = urls.pop();
        let url = urlItem[0];
        var currStage = urlItem[1];
        var currWeek = urlItem[2];
    
        request(url, {json: true}, (err, res, body) => {
            if (err) { console.log(err) }
            if (body.game_number) {
                body.teams.forEach((team) => {
                    team.players.forEach((player) => {
                        for (let k = 0; k < players.length; k++) {
                            if (players[k].playerID == player.esports_player_id) {
                                var playerName = players[k].name;
                                var playerID = player.esports_player_id;
                                var currPlayerStats = player.stats;
                                var playerFound = false;
                                var statsFound = false;
                                for (let i = 0; i < playerStats.length; i++) {
                                    if (playerStats[i].playerName == playerName) {
                                        // this player already exists in the array - update stats
                                        playerStats[i].stats.forEach((stat) => {
                                            if (stat.stage == currStage && stat.week == currWeek) {
                                                // stats for this week already exist - update them
                                                stat.playerStats.forEach((playerStat) => {
                                                    currPlayerStats.forEach((currPlayerStat) => {
                                                        if (currPlayerStat.name == playerStat.name) {
                                                            playerStat.value += currPlayerStat.value;
                                                        }
                                                    });
                                                });
                                                statsFound = true;
                                            }
                                        });
                                        if (!statsFound) {
                                            // push on stats for this stage and week
                                            var statsObj = {
                                                "stage": currStage,
                                                "week": currWeek,
                                                "playerStats": currPlayerStats
                                            };
                                            playerStats[i].stats.push(statsObj);
                                        }
                                        playerFound = true;
                                        break;
                                    }
                                }
                                if (!playerFound) {
                                    // player does not exist yet
                                    var obj = {};
                                    obj["playerName"] = playerName;
                                    obj["playerID"] = playerID;
                                    obj["stats"] = [{
                                        "stage": currStage,
                                        "week": currWeek,
                                        "playerStats": currPlayerStats
                                    }];
                                    playerStats.push(obj);
                                }
                            }
                        }
                    });
                });
                callback(urls, players, playerStats, newUpdatedStage, newUpdatedWeek, makeRequests);
            } else {
                callback(urls, players, playerStats, newUpdatedStage, newUpdatedWeek, makeRequests);
            }
        });
    } else {
        // all requests have been made
        savePlayerStats(playerStats, newUpdatedStage, newUpdatedWeek);
    }
}

function getUrls(matchIds) {
    var urls = [];
    matchIds.forEach((id) => {
        var stage = id[1];
        var week = id[2];
        for (let i = 1; i < 6; i++) {
            let url ='https://api.overwatchleague.com/stats/matches/' + id[0] + '/maps/' + i;
            let urlToPush = [url, stage, week];
            urls.push(urlToPush);
        }
    });
    return urls;
}

function savePlayerStats(playerStats, newUpdatedStage, newUpdatedWeek) {
    Stats.findOneAndUpdate({}, {$set: {stats: playerStats, lastUpdatedStage: newUpdatedStage, lastUpdatedWeek: newUpdatedWeek}}, (err, doc) => {
        if (err) { console.log(err) }
    });
}
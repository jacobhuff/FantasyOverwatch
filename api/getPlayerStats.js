const Stats = require('../models/Stats.js');

module.exports = function (players, yourTeamName, theirTeamName, stage, week, currWeek, res, req, rerouteMatchups) {
    Stats.find({}, (err, stats) => {
        
        // create array to store player data
        var playerData = [];

        var data = stats[0].stats;
        for (var i = 0; i < data.length; i++) {
            if (players.includes(data[i].playerName)) {
                var obj = {};
                obj["name"] = data[i].playerName;
                for (var j = 0; j < data[i].stats.length; j++) {
                    let stat = data[i].stats[j];
                    if (stage == stat.stage && week == stat.week) {
                        for (var k = 0; k < stat.playerStats.length; k++) {
                            obj[stat.playerStats[k].name] = stat.playerStats[k].value;
                        }     
                    }
                }
                playerData.push(obj);
            }
        }
        rerouteMatchups(playerData, yourTeamName, theirTeamName, currWeek, stage, week, res, req);
    });
}
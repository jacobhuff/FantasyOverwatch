const Stats = require('../models/Stats.js');

module.exports = function (players, yourTeam, theirTeam, stage, week, res, req, rerouteMatchups) {
    Stats.find({}, (err, stats) => {
        
        // create array to store player data
        var playerData = [];

        var data = stats[0].stats;
        for (var i = 0; i < data.length; i++) {
            if (players.includes(data[i].playerName)) {
                data[i].stats.forEach((stat) => {
                    if (stage == stat.stage && week == stat.week) {
                        var obj = {};
                        obj["name"] = data[i].playerName;
                        stat.playerStats.forEach((playerStat) => {
                            obj[playerStat.name] = playerStat.value;
                        });
                        playerData.push(obj);
                    }
                });
            }
        }
        rerouteMatchups(playerData, yourTeam, theirTeam, res);
    });
}
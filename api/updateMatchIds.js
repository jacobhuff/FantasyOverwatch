const owlSchedule = require('../models/owlSchedule.js');
const setOwlWeek = require('./setOwlWeek.js');
const Stats = require('../models/Stats.js');
const Player = require('../models/Player.js');

module.exports = function (updatePlayerStats) {

    // UPDATE CURRENT OWL STAGE AND WEEK
    setOwlWeek();
    
    Player.find({}, (err, players) => {
        Stats.find({}, (err, stats) => {
            var lastUpdatedStage = stats[0].lastUpdatedStage;
            var lastUpdatedWeek = stats[0].lastUpdatedWeek + 1;
        
            if (lastUpdatedWeek == 5) {
                lastUpdatedWeek = 1;
                lastUpdatedStage += 1;
            }

            owlSchedule.find({}, (err, schedule) => {
                if (err) { console.log(err) }

                var currOwlStage = schedule[0].currentStage;
                var currOwlWeek = schedule[0].currentWeek;
                var matchIds = [];

                // retrieve every match ID between when the league was last updated and the current OWL week
                for (let i = 0; i < schedule[0].weeks.length; i++) {
                    if (schedule[0].weeks[i][0] <= currOwlStage && 
                        schedule[0].weeks[i][0] >= lastUpdatedStage) {
                        if (schedule[0].weeks[i][0] == currOwlStage) {
                            if (schedule[0].weeks[i][1] < currOwlWeek) {
                                var currWeek = schedule[0].weeks[i][1];
                                var currStage = schedule[0].weeks[i][0];
                                schedule[0].weeks[i][4].forEach((matchId) => {
                                    let arrayToPush = [matchId, currStage, currWeek];
                                    matchIds.push(arrayToPush);
                                });
                            }
                        } else if (schedule[0].weeks[i][0] == lastUpdatedStage) {
                            if (schedule[0].weeks[i][1] >= lastUpdatedWeek) {
                                var currWeek = schedule[0].weeks[i][1];
                                var currStage = schedule[0].weeks[i][0];
                                schedule[0].weeks[i][4].forEach((matchId) => {
                                    let arrayToPush = [matchId, currStage, currWeek];
                                    matchIds.push(arrayToPush);
                                });
                            }
                        } else {
                            var currWeek = schedule[0].weeks[i][1];
                            var currStage = schedule[0].weeks[i][0];
                            schedule[0].weeks[i][4].forEach((matchId) => {
                                let arrayToPush = [matchId, currStage, currWeek];
                                matchIds.push(arrayToPush);
                            });
                        }
                    }
                }
                let newUpdatedStage = currOwlStage;
                let newUpdatedWeek = currOwlWeek - 1;
                if (currOwlWeek == 1) {
                    newUpdatedWeek = 4;
                    newUpdatedStage = currOwlStage - 1;
                }
                updatePlayerStats(matchIds, players, newUpdatedStage, newUpdatedWeek);
            });
        });
    });
}
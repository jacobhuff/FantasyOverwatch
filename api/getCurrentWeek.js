const request = require('request');
const Player = require('../models/Player');

module.exports = function getCurrentWeek(startingStage, currDate, res, req, callback) {
    var response = res;
    request('https://api.overwatchleague.com/schedule', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }
        var isDone = false;
        var currWeek;
        body.data.stages.forEach(stage => {
            stage.weeks.forEach((week) => {
                if (stage.name !== "All-Stars" && !isDone) {
                    if (week.startDate > currDate) {
                        let currStageNum = parseInt(stage.name[stage.name.length - 1], 10);
                        let currWeekNum = parseInt(week.name[week.name.length - 1], 10);
                        currWeek = ((currStageNum - startingStage) * 4) + currWeekNum;
                        isDone = true;
                    }
                }
            });
        });
        return callback(currWeek, response, req);
    });
}
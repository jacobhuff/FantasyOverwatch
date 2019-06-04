/* THIS FILE SETS THE START AND END TIMES FOR EACH WEEK OF EACH STAGE MINUS THE 5TH WEEK */
const request = require('request');
const owlSchedule = require('../models/owlSchedule');

module.exports = function setOwlWeeks() {
    request('https://api.overwatchleague.com/schedule', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }

        let weeks = getWeeks(body);
        owlSchedule.findOneAndUpdate({}, {$set: {weeks: weeks}}, (err, doc) => {
            if (err) { console.log(err) }
        });
    });
}

function getWeeks(body) {
    var weeks = [];
    body.data.stages.forEach(stage => {
        stage.weeks.forEach((week) => {
            if (stage.name !== "All-Stars" && week.name !== "Week 5") {
                var currStage = stage.name;
                var currWeek = week.name;
                var firstMatchStartDate = new Date(week.matches[0].startDate).getTime();
                var lastMatchEndDate = new Date(week.matches[week.matches.length - 1].endDate).getTime();
                var matchIds = [];
                for (let i = 0; i < week.matches.length; i++) {
                    matchIds.push(week.matches[i].id);
                }
                var dataToPush = [currStage[currStage.length - 1], currWeek[currWeek.length - 1], firstMatchStartDate, lastMatchEndDate, matchIds];
                weeks.push(dataToPush);
            }
        });
    });
    
    return weeks;
}
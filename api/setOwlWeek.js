const owlSchedule = require('../models/owlSchedule.js');

module.exports = function () {
    owlSchedule.find({}, (err, schedule) => {
        if (err) { console.log(err) }

        var isOwlSeason = false;
        var currentDate = new Date().getTime();
        var currOwlStage;
        var currOwlWeek;
        for (let i = 0; i < schedule[0].weeks.length; i++) {
            if (currentDate < schedule[0].weeks[i][2]) {
                // owl season is still happening
                isOwlSeason = true;
                if (i === 0) {
                    // it is week 1 stage 1 of owl
                    currOwlStage = 1;
                    currOwlWeek = 1;
                } else if (currentDate > schedule[0].weeks[i - 1][3]) {
                    // previous week is over
                    currOwlStage = schedule[0].weeks[i][0];
                    currOwlWeek = schedule[0].weeks[i][1];
                } else {
                    // in middle of a week
                    currOwlStage = schedule[0].weeks[i - 1][0];
                    currOwlWeek = schedule[0].weeks[i - 1][1];
                }
                break;
            }
        }

        if (!isOwlSeason) {
            // owl season is over
        } else {
            owlSchedule.findOneAndUpdate({}, {$set: {currentStage: currOwlStage, currentWeek: currOwlWeek}}, (err, doc) => {
                if (err) { console.log(err) }

                console.log("Current OWL Stage and Week updated");
            });
        }
    });
}
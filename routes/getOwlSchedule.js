const request = require('request');
const owlSchedule = require('../models/owlSchedule');

module.exports = function getOwlSchedule() {
    request('https://api.overwatchleague.com/schedule', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }

        let schedule = getMatchInfo(body);
        const newSchedule = new owlSchedule({
            schedule
        });
        newSchedule
            .save()
            .catch(err => console.log(err));
    });
}

function getMatchInfo(body) {
    var matchInfo = [];
    body.data.stages.forEach(stage => {
        stage.matches.forEach((match) => {
            if (match.tournament.type === "OPEN_MATCHES") {
                var matchID = match.id;
                var startTime = match.startDateTS;
                var infoToPush = {"matchID": matchID, "startTime": startTime};
                matchInfo.push(infoToPush);
            }
        });
    });
    
    return matchInfo;
}
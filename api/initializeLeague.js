const request = require('request');
const League = require('../models/League');
const Team = require('../models/Team');
const robin = require('roundrobin');
var numStages = 4;

module.exports = function initializeLeague(leagueName, leagueStartTime) {
    request('https://api.overwatchleague.com/schedule', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }

        var startTimes = [];
        var stageStartTimes = [];
        var prevStage = "Stage 0";
        var currStage;

        body.data.stages.forEach(stage => {
            currStage = stage.slug;
            stage.matches.forEach((match) => {
                if (match.tournament.type === "OPEN_MATCHES" && match.bracket.stage.title !== "2019 All-Star Week") {
                    // push all start times
                    var startTime = match.startDateTS;
                    var dataToPush = {"stage": currStage, "startTime": startTime};
                    startTimes.push(dataToPush);

                    // push first game of each stage
                    if (prevStage !== currStage) {
                        var toPush = {"stage": currStage, "startTime": startTime};
                        stageStartTimes.push(toPush);
                        prevStage = currStage;
                    }
                }
            });
        });

        var startingStage = findStartingStage(leagueStartTime, startTimes, stageStartTimes);
        var numWeeks = ((numStages + 1) - startingStage) * 4;
        League.findOneAndUpdate({name: leagueName}, {$set: {startingStage: startingStage}}, (err, doc) => {
            if (err) { console.log(err) }
            console.log("Starting Stage Inserted");
        });

        Team.find({league: leagueName}, (err, teams) => {
            let arrayofTeamNames = [];
            for (let i = 0; i < teams.length; i++) {
                arrayofTeamNames.push(teams[i].name);                
            }
            let roundRobin = robin(4, arrayofTeamNames);
            let remainingWeeks = numWeeks - roundRobin.length;
            let index = 0;
            for (let j = 0; j < remainingWeeks; j++) {
                roundRobin.push(roundRobin[index]);
                index++;
                if (index === roundRobin.length - 1) {
                    index = 0;
                }
            }
            
            League.findOneAndUpdate({name: leagueName}, {$set: {schedule: roundRobin}}, (err, doc) => {
                if (err) { console.log(err) }

                console.log("League Schedule has been created");
            });
        });
    });
}

function findStartingStage(leagueStartTime, startTimes, stageStartTimes) {
    let startingStage;
    let nextStage;

    for (let i = 0; i < startTimes.length; i++) {
        if (startTimes[i].startTime > leagueStartTime) {
            nextStage = startTimes[i].stage[startTimes[i].stage.length - 1];
            break;
        }
    }

    for (let j = 0; j < stageStartTimes.length; j++) {
        let stageNum = stageStartTimes[j].stage[stageStartTimes[j].stage.length - 1];
        if (stageNum === nextStage) {
            if (stageStartTimes[j].startTime > leagueStartTime) {
                startingStage = stageNum;
            } else {
                startingStage = stageNum + 1;
            }
        }
    }

    return startingStage;
}
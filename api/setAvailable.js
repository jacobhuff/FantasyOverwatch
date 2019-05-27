const request = require('request');
const League = require('../models/League');

module.exports = function setAvailable(leagueName) {
    request('https://api.overwatchleague.com/players', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }
        // create array to hold players
        var availablePlayers = [];

        // loop through players and store in array
        body.content.forEach(player => {
            let playerName = player.name;
            let playerTeam = player.teams[0].team.name;
            let dataToPush = [playerName, playerTeam];
            availablePlayers.push(dataToPush);
        });

        // save players to database
        League.findOneAndUpdate({name: leagueName}, {$set: {availablePlayers: availablePlayers}}, (err, league) => {
            if (err) {console.log(err)}
            
            console.log("updated available players");
        });

    });
}
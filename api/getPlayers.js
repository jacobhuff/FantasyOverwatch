const request = require('request');
const Player = require('../models/Player');

module.exports = function getPlayers() {
    request('https://api.overwatchleague.com/players', {json: true}, (err, res, body) => {
        if (err) { console.log(err) }
        body.content.forEach(player => {
            
            // store player info
            let name = player.name;
            let team = player.teams[0].team.name;
            let playerID = player.id;
            let teamID = player.teams[0].team.id;
            let role = player.attributes.role;

            // if (team === "Shanghai Dragons") {
            //     console.log(name + " | " + team + " | " + playerID + " | " + teamID)
            // }

            // create new player model
            const newPlayer = new Player({
                name,
                team,
                playerID,
                teamID,
                role
            });

            // save player to database
            newPlayer
                .save()
                .catch(err => console.log(err));
        });
    });
}
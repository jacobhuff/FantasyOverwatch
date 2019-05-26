const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Load Player model
const Player = require('../models/Player');

router.get('/', ensureAuthenticated, (req, res) => {
    Player.find({}, (err, players) => {
        var data= {};
        players.forEach((player) => {
            var playerName = player.name;
            var playerRole = player.role;
            var dataToPush = [playerName, playerRole];
            if (data[player.team]) {
                data[player.team].push(dataToPush);
            } else {
                data[player.team] = [dataToPush];
            }
        });
        res.render("players", {
           teams: data 
        });
    });
});
router.post('/', (req, res) => {
    // render league page
    res.redirect('players');
});

module.exports = router;
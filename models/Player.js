const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    team: {
        type: String,
        required: true
    },
    playerID: {
        type: Number,
        required: true
    },
    teamID: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        required: true
    }
});

const Player = mongoose.model('Player', PlayerSchema);

module.exports = Player;
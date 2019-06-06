const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    owner: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true
    },
    league: {
        type: String,
        required: true
    },
    record: {
        type: String,
        required: true
    },
    rank: {
        type: String,
        required: true
    },
    players: {
        type: Array,
    },
    lineups: {
        type: Array
    },
    pointsFor: {
        type: Number
    },
    pointsAgainst: {
        type: Number
    }
});

const Team = mongoose.model('Team', TeamSchema);

module.exports = Team;
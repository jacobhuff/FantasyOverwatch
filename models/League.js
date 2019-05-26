const mongoose = require('mongoose');

const LeagueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    numTeams: {
        type: Number,
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    administrator: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        required: true
    }
});

const League = mongoose.model('League', LeagueSchema);

module.exports = League;
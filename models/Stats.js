const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
    stats: {
        type: Array
    },
    lastUpdatedStage: {
        type: Number
    },
    lastUpdatedWeek: {
        type: Number
    }
});

const Stats = mongoose.model('Stats', StatsSchema);

module.exports = Stats;
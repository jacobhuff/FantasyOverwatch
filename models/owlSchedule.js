const mongoose = require('mongoose');

const owlScheduleSchema = new mongoose.Schema({
    weeks: {
        type: Array
    },
    currentStage: {
        type: Number
    },
    currentWeek: {
        type: Number
    }
});

const owlSchedule = mongoose.model('owlSchedule', owlScheduleSchema);

module.exports = owlSchedule;
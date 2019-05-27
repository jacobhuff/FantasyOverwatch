const mongoose = require('mongoose');

const owlScheduleSchema = new mongoose.Schema({
    schedule: {
        type: Array
    }
});

const owlSchedule = mongoose.model('owlSchedule', owlScheduleSchema);

module.exports = owlSchedule;
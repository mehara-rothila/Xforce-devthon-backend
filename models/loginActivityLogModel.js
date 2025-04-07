// models/loginActivityLogModel.js
const mongoose = require('mongoose');

const loginActivityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for faster querying by user
    },
    loginDate: {
        type: Date,
        default: Date.now,
        index: true // Index for faster querying by date range
    }
});

// Optional: Prevent duplicate logs for the same user on the same day if needed,
// though generally logging each instance is fine.
// loginActivityLogSchema.index({ user: 1, loginDate: 1 });

const LoginActivityLog = mongoose.model('LoginActivityLog', loginActivityLogSchema);

module.exports = LoginActivityLog;
// models/userProgressModel.js
const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: mongoose.Schema.ObjectId,
        ref: 'Subject',
        required: true
    },
    topicProgress: [{
        topic: { // Could be the topic ObjectId from the embedded array in Subject
            type: mongoose.Schema.Types.ObjectId,
            required: true
         },
         progress: { // e.g., percentage 0-100
            type: Number,
            default: 0,
            min: 0,
            max: 100
         },
         mastery: {
            type: String,
            enum: ['low', 'medium', 'high', 'mastered'],
            default: 'low'
         },
         lastAccessed: {
            type: Date
         }
     }],
    overallSubjectProgress: { // Calculated or stored
         type: Number,
         default: 0,
         min: 0,
         max: 100
    }
}, { timestamps: true });

// Index for efficient querying
userProgressSchema.index({ user: 1, subject: 1 }, { unique: true });

const UserProgress = mongoose.model('UserProgress', userProgressSchema);
module.exports = UserProgress;
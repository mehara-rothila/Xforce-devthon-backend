// models/achievementModel.js
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        unique: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    icon: { 
        type: String 
    }, // Identifier for frontend icon
    category: { 
        type: String, 
        enum: ['academic', 'engagement', 'milestone', 'special'], 
        required: true 
    },
    xp: { 
        type: Number, 
        default: 50 
    },
    points: { 
        type: Number, 
        default: 0 
    }, // Reward points
    rarity: { 
        type: String, 
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], 
        default: 'common' 
    },
    // New fields for trigger-based achievement system
    trigger: {
        type: String,
        enum: [
            'quiz_perfect_score',   // Get 100% on a quiz
            'quiz_completion',      // Complete any quiz
            'quiz_streak',          // Complete multiple quizzes in a row
            'subject_mastery',      // Complete all topics in a subject
            'forum_posts',          // Create forum posts
            'forum_replies',        // Reply to forum posts
            'forum_best_answers',   // Get best answer votes
            'resource_access',      // Access resources
            'login_streak',         // Daily login streak
            'study_streak'          // Study activity streak
        ],
        required: true
    },
    requirement: {
        type: Number,
        default: 1,
        min: 1
    },
    condition: {
        type: Object,
        default: {}
    },
    // Example condition: { difficulty: 'hard' } - Only applies to hard quizzes
    // Example condition: { category: 'pdf' } - Only counts PDF resources
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
module.exports = Achievement;
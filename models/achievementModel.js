// Achievement model 
// models/achievementModel.js
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String }, // Identifier for frontend icon
    category: { type: String, enum: ['academic', 'engagement', 'milestone', 'special'], required: true },
    xp: { type: Number, default: 50 },
    rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
    // Criteria for unlocking might be handled in logic rather than schema
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
module.exports = Achievement;
// migrations/001-add-quiz-points.js
const mongoose = require('mongoose');
const User = require('../models/userModel');
const MigrationRegistry = require('./migration-registry');

module.exports = {
  id: '001-add-quiz-points',
  description: 'Add quizPointsEarned field to all users',
  
  async execute() {
    console.log('Running migration: Adding quizPointsEarned field');
    const result = await User.updateMany(
      { quizPointsEarned: { $exists: false } },
      { $set: { quizPointsEarned: 0 } }
    );
    console.log(`Migration complete: ${result.modifiedCount} users updated`);
    
    // Mark this migration as executed
    await MigrationRegistry.markAsExecuted(this.id);
    return result;
  }
};
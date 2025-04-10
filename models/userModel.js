// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide your name'], trim: true },
  email: { type: String, required: [true, 'Please provide your email'], unique: true, lowercase: true },
  phoneNumber: { type: String, trim: true },
  password: { type: String, required: [true, 'Please provide a password'], minlength: [8, 'Password must be at least 8 characters long'], select: false },
  subjects: [{ type: mongoose.Schema.ObjectId, ref: 'Subject' }],
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  streak: { type: Number, default: 0 },
  achievements: [{ type: mongoose.Schema.ObjectId, ref: 'Achievement' }],
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  passwordResetOtp: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  // --- Aggregated Quiz Stats ---
  quizCompletedCount: { type: Number, default: 0, min: 0 },
  quizTotalPercentageScoreSum: { type: Number, default: 0, min: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// --- Virtual for Accuracy Rate ---
userSchema.virtual('quizAccuracyRate').get(function() {
  const count = typeof this.quizCompletedCount === 'number' ? this.quizCompletedCount : 0;
  const sum = typeof this.quizTotalPercentageScoreSum === 'number' ? this.quizTotalPercentageScoreSum : 0;
  if (count === 0) return 0;
  const accuracy = sum / count;
  const nonNegativeAccuracy = Math.max(0, accuracy);
  return Math.round(nonNegativeAccuracy);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
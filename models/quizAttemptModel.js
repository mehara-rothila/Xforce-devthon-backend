// models/quizAttemptModel.js
const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionId: { // Stores Question _id
      type: String, // Using String as Question _id is ObjectId but stored as string in processing
      required: true
    },
    answerId: { // Stores selected Option _id (as string)
      type: String
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  score: { // Raw score based on question points
    type: Number,
    required: true
  },
  totalPoints: { // Total possible points for the quiz at time of attempt
    type: Number,
    required: true
  },
  percentageScore: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    default: false
  },
  timeTaken: {
    type: Number // in seconds
  },
  pointsAwarded: { // User points earned from this attempt
    type: Number,
    default: 0
  }
}, { timestamps: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
module.exports = QuizAttempt;
// Quiz model 
const mongoose = require('mongoose');

// Option Schema (for multiple choice questions)
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Question Schema
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question must have text']
  },
  options: [optionSchema],
  correctAnswer: {
    type: String
  },
  explanation: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  points: {
    type: Number,
    default: 10
  },
  // For true/false questions
  isTrueFalse: {
    type: Boolean,
    default: false
  },
  // For fill-in-the-blank questions
  isFillBlank: {
    type: Boolean,
    default: false
  }
});

// Quiz Schema
const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz must have a title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject',
    required: [true, 'Quiz must belong to a subject']
  },
  topic: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject.topics'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  timeLimit: {
    type: Number, // In minutes
    default: 30
  },
  questions: [questionSchema],
  isPublished: {
    type: Boolean,
    default: false
  },
  passScore: {
    type: Number,
    default: 70 // Percentage needed to pass
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  attempts: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating total questions
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Virtual for calculating total points possible
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((sum, question) => sum + question.points, 0);
});

// Create the model
const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
// models/quizModel.js
const mongoose = require('mongoose');

// Option Schema (Keep as is)
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

// Question Schema (Keep as is)
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
  isTrueFalse: {
    type: Boolean,
    default: false
  },
  isFillBlank: {
    type: Boolean,
    default: false
  },
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
  // --- RATING FIELDS (UPDATED) ---
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    // CORRECTED: Removed TypeScript type annotation
    set: (val) => Math.round(val * 10) / 10
  },
  ratingsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ratingsSum: {
    type: Number,
    default: 0,
    min: 0
  }
  // --- END RATING FIELDS ---
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Pre-save hook for correctAnswer (Keep as is)
quizSchema.pre('save', function(next) {
  if (this.isModified('questions') || this.isNew) {
    // console.log(`Running pre-save hook for Quiz "${this.title}"`);
    this.questions.forEach((question, qIndex) => {
      if (question.options && Array.isArray(question.options) && question.options.length > 0) {
        const correctOption = question.options.find(opt => opt.isCorrect === true);
        if (correctOption && correctOption._id) {
          question.correctAnswer = correctOption._id.toString();
        } else {
          question.correctAnswer = null;
        }
      } else {
        question.correctAnswer = null;
      }
    });
  }
  next();
});

// Virtual properties (Keep as is)
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions?.length || 0;
});

quizSchema.virtual('totalPoints').get(function() {
  if (!this.questions || this.questions.length === 0) {
    return 0;
  }
  return this.questions.reduce((sum, question) => sum + (question.points || 0), 0);
});


const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
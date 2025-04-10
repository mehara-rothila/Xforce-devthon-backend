// models/quizModel.js
const mongoose = require('mongoose');

// Option Schema (CORRECTED - no _id: false)
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
}); // Mongoose adds _id automatically

// Question Schema
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question must have text']
  },
  options: [optionSchema],
  correctAnswer: {
    // This will store the _id string of the correct option
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
  // Mongoose adds _id automatically
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

// --- NEW: Mongoose Pre-Save Hook to set correctAnswer ---
quizSchema.pre('save', function(next) {
  // 'this' refers to the quiz document being saved
  // Run if questions array is modified or if it's a new document
  if (this.isModified('questions') || this.isNew) {
    console.log(`Running pre-save hook for Quiz "${this.title}"`); // Debug log
    this.questions.forEach((question, qIndex) => {
      if (question.options && Array.isArray(question.options) && question.options.length > 0) {
        // Mongoose ensures options have _ids at this point (or assigns them upon save)
        const correctOption = question.options.find(opt => opt.isCorrect === true); // Explicit check

        if (correctOption && correctOption._id) {
          // Found the correct option, set correctAnswer to its ID string
          question.correctAnswer = correctOption._id.toString();
          // console.log(` -> Q ${qIndex + 1}: Set correctAnswer to ${question.correctAnswer}`);
        } else {
          // No correct option found or marked - ensure correctAnswer is null
          if (question.correctAnswer !== null) { // Only log if it changed
              console.warn(` -> Q ${qIndex + 1} ("${question.text}"): No correct option marked or found. Setting correctAnswer to null.`);
          }
          question.correctAnswer = null;
        }
      } else {
        // No options array - ensure correctAnswer is null
         if (question.correctAnswer !== null) { // Only log if it changed
            console.warn(` -> Q ${qIndex + 1} ("${question.text}"): No options array found. Setting correctAnswer to null.`);
         }
        question.correctAnswer = null;
      }
    });
  }
  next(); // Continue with the save operation
});
// --- End Hook ---


// Virtual property for number of questions
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions?.length || 0;
});

// Virtual property for total possible points
quizSchema.virtual('totalPoints').get(function() {
  if (!this.questions || this.questions.length === 0) {
    return 0;
  }
  return this.questions.reduce((sum, question) => sum + (question.points || 0), 0);
});


const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;

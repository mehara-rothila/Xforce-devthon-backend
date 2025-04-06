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
}, { _id: false }); // <--- PROBLEM: This prevents options from getting unique IDs

// Question Schema
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question must have text']
  },
  options: [optionSchema], // Array of options based on the schema above
  correctAnswer: {
    // This should store the _id of the correct option IF options have IDs
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
   // Mongoose automatically adds _id to nested schemas unless disabled
   // So questions *will* have an _id by default.
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
  topic: { // Optional: Link to a specific topic within a subject
    type: mongoose.Schema.ObjectId,
    // If topics are embedded in Subject, referencing might be complex.
    // Consider if Topic should be its own collection if you need direct refs often.
    ref: 'Subject.topics' // This reference might not work as expected if topics are embedded.
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
  questions: [questionSchema], // Embed the questions
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
  attempts: { // Number of times the quiz has been attempted
    type: Number,
    default: 0
  },
  rating: { // Average user rating
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converting to object
});

// Virtual property to easily get the number of questions
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Virtual property to calculate total possible points
quizSchema.virtual('totalPoints').get(function() {
  // Ensure questions array exists before reducing
  if (!this.questions || this.questions.length === 0) {
    return 0;
  }
  return this.questions.reduce((sum, question) => sum + (question.points || 0), 0);
});

// Create the model from the schema
const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;

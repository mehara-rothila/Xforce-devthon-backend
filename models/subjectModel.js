// Subject model 
const mongoose = require('mongoose');

// Topic Schema (embedded in Subject)
const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Topic must have a name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  mastery: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  order: {
    type: Number,
    required: true
  },
  resources: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Resource'
  }]
}, {
  _id: true, // Give each topic its own ID
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Subject Schema
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Subject must have a description']
  },
  color: {
    type: String,
    default: '#3498db' // Default color
  },
  gradientFrom: {
    type: String,
    default: '#3498db'
  },
  gradientTo: {
    type: String,
    default: '#2980b9'
  },
  icon: {
    type: String,
    default: 'book'
  },
  topics: [topicSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for quizzes related to this subject
subjectSchema.virtual('quizzes', {
  ref: 'Quiz',
  foreignField: 'subject',
  localField: '_id'
});

// Virtual for calculating total number of topics
subjectSchema.virtual('topicCount').get(function() {
  return this.topics.length;
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
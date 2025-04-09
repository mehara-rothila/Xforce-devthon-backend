const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource must have a title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Resource must have a category'],
    enum: ['Past Papers', 'Notes', 'Practice Questions', 'Tutorials', 'Reference', 'Other']
  },
  subject: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject',
    required: [true, 'Resource must belong to a subject']
  },
  topic: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject.topics'
  },
  type: {
    type: String,
    required: [true, 'Resource must have a type'],
    enum: ['PDF', 'Video', 'Notes', 'Interactive', 'Other']
  },
  size: {
    type: String,
    required: [true, 'Resource must have a size']
  },
  downloads: {
    type: Number,
    default: 0
  },
  premium: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  filePath: {
    type: String,
    required: [true, 'Resource must have a file path']
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
resourceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
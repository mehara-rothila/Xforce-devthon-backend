// models/subjectModel.js
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
  // Removed mastery from here - should be in UserProgress
  // mastery: {
  //   type: String,
  //   enum: ['low', 'medium', 'high'],
  //   default: 'low'
  // },
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
  topics: [topicSchema], // Embed topics within the subject
  isActive: {
    type: Boolean,
    default: true,
    select: false // Hide by default unless specifically requested
  },
  // Optional: Link to the primary forum category for this subject
  forumCategoryId: {
    type: mongoose.Schema.ObjectId,
    ref: 'ForumCategory'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }, // Keep virtuals enabled for toJSON
  toObject: { virtuals: true }
});

// Virtual populate for quizzes (if needed)
subjectSchema.virtual('quizzes', {
  ref: 'Quiz',
  foreignField: 'subject',
  localField: '_id'
});

// --- UPDATED VIRTUAL GETTER ---
// Virtual for topic count (safer version)
subjectSchema.virtual('topicCount').get(function() {
  // Check if this.topics exists and is an array before accessing length
  return this.topics && Array.isArray(this.topics) ? this.topics.length : 0;
});
// --- END UPDATED VIRTUAL GETTER ---

// Ensure isActive subjects are easily queryable
subjectSchema.pre(/^find/, function(next) {
  // Only find subjects where isActive is not explicitly false
  this.find({ isActive: { $ne: false } });
  next();
});


const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;

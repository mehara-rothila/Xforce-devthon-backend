// models/forumTopicModel.js
const mongoose = require('mongoose');

const forumTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Topic title is required']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumCategory',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  repliesCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  lastReplyAt: Date,
  // --- ADDED FIELDS ---
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference the User model
  },
  moderationDate: {
    type: Date
  }
  // --- END ADDED FIELDS ---
}, { timestamps: true });

const ForumTopic = mongoose.model('ForumTopic', forumTopicSchema);
module.exports = ForumTopic;
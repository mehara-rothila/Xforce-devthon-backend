// models/forumReplyModel.js
const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Reply content is required']
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumTopic',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isBestAnswer: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

const ForumReply = mongoose.model('ForumReply', forumReplySchema);
module.exports = ForumReply;
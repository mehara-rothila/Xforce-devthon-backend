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
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const ForumReply = mongoose.model('ForumReply', forumReplySchema);
module.exports = ForumReply;
const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true
  },
  description: String,
  color: {
    type: String,
    default: '#4a5568'
  },
  gradientFrom: String,
  gradientTo: String,
  icon: String,
  topicsCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const ForumCategory = mongoose.model('ForumCategory', forumCategorySchema);
module.exports = ForumCategory;
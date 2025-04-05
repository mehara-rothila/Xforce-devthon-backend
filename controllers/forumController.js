// Forum controller 
const ForumCategory = require('../models/forumCategoryModel');
const ForumTopic = require('../models/forumTopicModel');
const ForumReply = require('../models/forumReplyModel');

// Get All Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await ForumCategory.find();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const topic = await ForumTopic.findById(req.params.id)
      .populate('author', 'name')
      .populate('category', 'name color');
    
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    // Increment view count
    topic.views += 1;
    await topic.save();
    
    // Get replies for this topic
    const replies = await ForumReply.find({ topic: req.params.id })
      .populate('author', 'name')
      .sort('createdAt');
    
    res.status(200).json({ 
      success: true, 
      data: { topic, replies } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create Topic
exports.createTopic = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const topic = await ForumTopic.create({
      title,
      content,
      category,
      author: req.user.id
    });

    // Update category stats
    await ForumCategory.findByIdAndUpdate(category, {
      $inc: { topicsCount: 1 }
    });

    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get Topics in Category
exports.getTopicsByCategory = async (req, res) => {
  try {
    const topics = await ForumTopic.find({ category: req.params.categoryId })
      .populate('author', 'name')
      .sort('-createdAt');

    res.status(200).json({ success: true, data: topics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add Reply to Topic
exports.addReply = async (req, res) => {
  try {
    const reply = await ForumReply.create({
      content: req.body.content,
      topic: req.params.topicId,
      author: req.user.id
    });

    // Update topic stats
    await ForumTopic.findByIdAndUpdate(req.params.topicId, {
      $inc: { repliesCount: 1 },
      lastReplyAt: Date.now()
    });

    res.status(201).json({ success: true, data: reply });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Mark Best Answer
exports.markBestAnswer = async (req, res) => {
  try {
    const reply = await ForumReply.findById(req.params.id);
    
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }
    
    // Get the topic to check if user is author
    const topic = await ForumTopic.findById(reply.topic);
    
    // Check if user is topic author
    if (topic.author.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only the topic author can mark the best answer' 
      });
    }
    
    // Clear any existing best answers for this topic
    await ForumReply.updateMany(
      { topic: reply.topic },
      { isBestAnswer: false }
    );
    
    // Mark this reply as best answer
    reply.isBestAnswer = true;
    await reply.save();
    
    res.status(200).json({ success: true, data: reply });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Vote on a Reply
exports.voteReply = async (req, res) => {
  try {
    const reply = await ForumReply.findById(req.params.id);
    
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }
    
    const { vote } = req.body;
    
    if (vote !== 'up' && vote !== 'down') {
      return res.status(400).json({ 
        success: false, 
        message: 'Vote must be either "up" or "down"' 
      });
    }
    
    const userId = req.user.id;
    
    // Check if user already voted
    const hasUpvoted = reply.upvotes.includes(userId);
    const hasDownvoted = reply.downvotes.includes(userId);
    
    // Handle upvote
    if (vote === 'up') {
      if (hasUpvoted) {
        // Remove upvote if already upvoted
        reply.upvotes = reply.upvotes.filter(id => id.toString() !== userId);
      } else {
        // Add upvote and remove downvote if exists
        reply.upvotes.push(userId);
        if (hasDownvoted) {
          reply.downvotes = reply.downvotes.filter(id => id.toString() !== userId);
        }
      }
    }
    
    // Handle downvote
    if (vote === 'down') {
      if (hasDownvoted) {
        // Remove downvote if already downvoted
        reply.downvotes = reply.downvotes.filter(id => id.toString() !== userId);
      } else {
        // Add downvote and remove upvote if exists
        reply.downvotes.push(userId);
        if (hasUpvoted) {
          reply.upvotes = reply.upvotes.filter(id => id.toString() !== userId);
        }
      }
    }
    
    await reply.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        upvotes: reply.upvotes.length,
        downvotes: reply.downvotes.length
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Topic
exports.deleteTopic = async (req, res) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);
    
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    
    // Delete all replies for the topic
    await ForumReply.deleteMany({ topic: req.params.id });
    
    // Delete the topic
    await ForumTopic.findByIdAndDelete(req.params.id);
    
    // Update category stats
    await ForumCategory.findByIdAndUpdate(topic.category, {
      $inc: { topicsCount: -1 }
    });
    
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
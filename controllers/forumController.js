// controllers/forumController.js
const ForumCategory = require('../models/forumCategoryModel');
const ForumTopic = require('../models/forumTopicModel');
const ForumReply = require('../models/forumReplyModel');
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// === Category Controllers ===

/**
 * @desc     Get All Categories
 * @route    GET /api/forum/categories
 * @access   Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ForumCategory.find();
    res.status(200).json({
        status: 'success',
        results: categories.length,
        data: { categories }
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    next(err);
  }
};

/**
 * @desc     Create New Category
 * @route    POST /api/forum/categories
 * @access   Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    if (!req.body.name) {
        return res.status(400).json({ status: 'fail', message: 'Category name is required.' });
    }
    // Auto-generate gradient if only color is provided
    if (req.body.color && !req.body.gradientFrom) {
        req.body.gradientFrom = req.body.color;
    }
    if (req.body.color && !req.body.gradientTo) {
        // Simple gradient generation
        const defaultGradientTo = req.body.color.length === 7 ? req.body.color.substring(0, 5) + 'aa' : '#cccccc';
        req.body.gradientTo = defaultGradientTo;
    }

    const newCategory = await ForumCategory.create(req.body);

    res.status(201).json({
        status: 'success',
        data: { category: newCategory }
    });
  } catch (err) {
    console.error("Error creating category:", err);
    if (err.code === 11000) {
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') {
         const errors = Object.values(err.errors).map(el => el.message);
         const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err);
  }
};

/**
 * @desc     Update Category
 * @route    PATCH /api/forum/categories/:id
 * @access   Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid category ID format.' });
    }

    // Prevent manual update of counts
    delete req.body.topicsCount;
    delete req.body.postsCount;

    const category = await ForumCategory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ status: 'fail', message: 'Category not found' });
    }

    res.status(200).json({
        status: 'success',
        data: { category }
    });
  } catch (err) {
    console.error("Error updating category:", err);
    if (err.code === 11000) {
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err);
  }
};

/**
 * @desc     Delete Category
 * @route    DELETE /api/forum/categories/:id
 * @access   Private/Admin
 */
exports.deleteCategory = async (req, res, next) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid category ID format.' });
    }

    // Prevent deletion if category contains topics
    const topicCount = await ForumTopic.countDocuments({ category: req.params.id });
    if (topicCount > 0) {
        return res.status(400).json({
            status: 'fail',
            message: `Cannot delete category: It contains ${topicCount} topic(s). Please move or delete topics first.`
        });
    }

    const category = await ForumCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ status: 'fail', message: 'Category not found' });
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    next(err);
  }
};


// === Topic Controllers ===

/**
 * @desc     Get Topic by ID (includes replies)
 * @route    GET /api/forum/topics/:id
 * @access   Public
 */
exports.getTopicById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }

    const query = { _id: req.params.id };
    
    // If not admin/moderator, only show approved topics
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
        query.isApproved = true;
    }

    // Fetch topic and increment views atomically
    const topic = await ForumTopic.findOneAndUpdate(
        query,
        { $inc: { views: 1 } },
        { new: false }
      )
      .populate('author', 'name')
      .populate('category', 'name color')
      .populate('moderatedBy', 'name');

    if (!topic) {
      return res.status(404).json({ 
        status: 'fail', 
        message: topic === null ? 'Topic not found or awaiting moderation' : 'Topic not found' 
      });
    }

    // For replies, also filter by approval status for non-admin users
    const replyQuery = { topic: req.params.id };
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
        replyQuery.isApproved = true;
    }

    // Fetch replies separately
    const replies = await ForumReply.find(replyQuery)
      .populate('author', 'name')
      .populate('moderatedBy', 'name')
      .sort('createdAt');

    res.status(200).json({
      status: 'success',
      data: { topic, replies }
    });
  } catch (err) {
     console.error("Error fetching topic by ID:", err);
     next(err);
  }
};

/**
 * @desc     Create New Topic
 * @route    POST /api/forum/topics
 * @access   Private (requires login)
 */
exports.createTopic = async (req, res, next) => {
  try {
    const { title, content, category } = req.body;

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
        return res.status(401).json({ status: 'fail', message: 'User not authenticated.' });
    }
    const authorId = req.user.id;

    // Basic validation
    if (!title || !content || !category) {
        return res.status(400).json({ status: 'fail', message: 'Title, content, and category are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid category ID format.' });
    }

    // Verify category exists
    const categoryExists = await ForumCategory.findById(category);
    if (!categoryExists) {
        return res.status(404).json({ status: 'fail', message: 'Category not found.' });
    }

    // Auto-approve for admins/moderators
    const isAutoApproved = ['admin', 'moderator'].includes(req.user.role);

    // Create topic with approval status
    const newTopic = await ForumTopic.create({
      title,
      content,
      category,
      author: authorId,
      isApproved: isAutoApproved,
      // If auto-approved, set moderation info
      ...(isAutoApproved && {
        moderatedBy: authorId,
        moderationDate: new Date()
      })
    });

    // Update category stats ONLY if topic is auto-approved
    if (isAutoApproved) {
        try {
            await ForumCategory.findByIdAndUpdate(category, {
                $inc: { topicsCount: 1, postsCount: 1 }
            });
        } catch (updateErr) {
            console.error(`Error updating category counts for ${category}:`, updateErr);
        }
    }

    res.status(201).json({ 
        status: 'success', 
        data: { 
            topic: newTopic,
            message: isAutoApproved ? 
                'Topic has been published.' : 
                'Topic has been submitted for moderation and will be visible after approval.'
        } 
    });

  } catch (err) {
    console.error("Error creating topic:", err);
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err);
  }
};

/**
 * @desc     Get Topics in a Category (with Pagination)
 * @route    GET /api/forum/categories/:categoryId/topics
 * @access   Public
 */
exports.getTopicsByCategory = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.categoryId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid category ID format.' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Build query - for normal users, only show approved topics
    const query = { category: req.params.categoryId };
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
        query.isApproved = true;
    }

    // Find topics for the category
    const topicsQuery = ForumTopic.find(query)
      .populate('author', 'name')
      .sort('-isPinned -lastReplyAt -createdAt')
      .skip(skip)
      .limit(limit);

    // Count total topics for pagination
    const totalTopicsQuery = ForumTopic.countDocuments(query);

    // Execute queries concurrently
    const [topics, totalTopics] = await Promise.all([topicsQuery, totalTopicsQuery]);

    res.status(200).json({
        status: 'success',
        results: topics.length,
        totalResults: totalTopics,
        totalPages: Math.ceil(totalTopics / limit) || 1,
        currentPage: page,
        data: { topics }
    });
  } catch (err) {
    console.error("Error fetching topics by category:", err);
    next(err);
  }
};

/**
 * @desc     Delete Topic (and its replies)
 * @route    DELETE /api/forum/topics/:id
 * @access   Private/Admin/Moderator
 */
exports.deleteTopic = async (req, res, next) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) { 
         return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' }); 
     }

    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) { 
        return res.status(404).json({ status: 'fail', message: 'Topic not found' }); 
    }

    const categoryId = topic.category;

    // Delete associated replies
    const deletedRepliesResult = await ForumReply.deleteMany({ topic: req.params.id });
    console.log(`Deleted ${deletedRepliesResult.deletedCount} replies for topic ${req.params.id}`);

    // Delete the topic
    await ForumTopic.findByIdAndDelete(req.params.id);
    console.log(`Deleted topic ${req.params.id}`);

    // Only update category stats if the topic was approved (and thus counted in stats)
    if (topic.isApproved) {
        // Posts count decreases by 1 (the topic) + number of approved replies
        // We need to calculate this carefully since we don't know how many replies were approved
        const postsDecrement = 1; // Start with 1 for the topic itself
        
        await ForumCategory.findByIdAndUpdate(categoryId, {
            $inc: { topicsCount: -1, postsCount: -postsDecrement }
        });
    }

    res.status(200).json({ status: 'success', message: 'Topic and replies deleted successfully.' });
  } catch (err) {
    console.error("Error deleting topic:", err);
    next(err);
  }
};


// === Reply Controllers ===

/**
 * @desc     Add Reply to Topic
 * @route    POST /api/forum/topics/:topicId/replies
 * @access   Private (requires login)
 */
exports.addReply = async (req, res, next) => {
  try {
    const topicId = req.params.topicId;
    const { content } = req.body;

    // Validations
    if (!mongoose.Types.ObjectId.isValid(topicId)) { 
        return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' }); 
    }
    if (!content) { 
        return res.status(400).json({ status: 'fail', message: 'Reply content is required.' }); 
    }
    if (!req.user || !req.user.id) { 
        return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); 
    }

    // Get the topic - only if it's approved
    const topic = await ForumTopic.findOne({ _id: topicId, isApproved: true });
    if (!topic) { 
        return res.status(404).json({ status: 'fail', message: 'Topic not found or awaiting moderation.' }); 
    }
    if (topic.isLocked) { 
        return res.status(403).json({ status: 'fail', message: 'Topic is locked, cannot add replies.' }); 
    }

    // Auto-approve for admins/moderators
    const isAutoApproved = ['admin', 'moderator'].includes(req.user.role);

    // Create reply with appropriate approval status
    const newReply = await ForumReply.create({
        content,
        topic: topicId,
        author: req.user.id,
        isApproved: isAutoApproved,
        // If auto-approved, set moderation info
        ...(isAutoApproved && {
            moderatedBy: req.user.id,
            moderationDate: new Date()
        })
    });

    // Only update stats if reply is auto-approved
    if (isAutoApproved) {
        // Update topic stats
        topic.repliesCount = (topic.repliesCount || 0) + 1;
        topic.lastReplyAt = newReply.createdAt;
        await topic.save({ validateBeforeSave: false });

        // Update category posts count
        await ForumCategory.findByIdAndUpdate(topic.category, { $inc: { postsCount: 1 } });
    }

    // Populate author details for the response
    const populatedReply = await ForumReply.findById(newReply._id).populate('author', 'name');

    res.status(201).json({ 
        status: 'success', 
        data: { 
            reply: populatedReply,
            message: isAutoApproved ? 
                'Reply has been posted.' : 
                'Reply has been submitted for moderation and will be visible after approval.'
        }
    });
  } catch (err) {
    console.error("Error adding reply:", err);
    if (err.name === 'ValidationError') {
         const errors = Object.values(err.errors).map(el => el.message);
         const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err);
  }
};

/**
 * @desc     Mark Reply as Best Answer
 * @route    PATCH /api/forum/replies/:id/best
 * @access   Private (Topic Author Only)
 */
exports.markBestAnswer = async (req, res, next) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) { 
         return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' }); 
     }
     if (!req.user || !req.user.id) { 
         return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); 
     }

    // Only get approved replies
    const reply = await ForumReply.findOne({ _id: req.params.id, isApproved: true });
    if (!reply) { 
        return res.status(404).json({ status: 'fail', message: 'Reply not found or awaiting moderation' }); 
    }

    const topic = await ForumTopic.findById(reply.topic);
    if (!topic) { 
        return res.status(404).json({ status: 'fail', message: 'Associated topic not found' }); 
    }

    // Check if the logged-in user is the author of the topic
    if (topic.author.toString() !== req.user.id) {
        return res.status(403).json({ status: 'fail', message: 'Only the topic author can mark the best answer' });
    }

    // Determine the new status (toggle)
    const newBestAnswerStatus = !reply.isBestAnswer;

    // Unset other best answers for this topic first
    await ForumReply.updateMany(
        { topic: reply.topic, _id: { $ne: reply._id } },
        { isBestAnswer: false }
    );

    // Set the new status for the current reply
    reply.isBestAnswer = newBestAnswerStatus;
    await reply.save();

    // Populate author for the response
    const updatedReply = await ForumReply.findById(reply._id).populate('author', 'name');

    res.status(200).json({ status: 'success', data: { reply: updatedReply } });
  } catch (err) {
     console.error("Error marking best answer:", err);
     next(err);
  }
};

/**
 * @desc     Vote on a Reply (Upvote/Downvote)
 * @route    POST /api/forum/replies/:id/vote
 * @access   Private (requires login)
 */
exports.voteReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) { 
        return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' }); 
    }
    if (!req.user || !req.user.id) { 
        return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); 
    }

    const { vote } = req.body; // Expect 'up' or 'down'
    if (vote !== 'up' && vote !== 'down') {
        return res.status(400).json({ status: 'fail', message: 'Vote must be either "up" or "down"' });
    }

    const userId = req.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Only allow voting on approved replies
    const reply = await ForumReply.findOne({ _id: req.params.id, isApproved: true }).select('upvotes downvotes');
    if (!reply) { 
        return res.status(404).json({ status: 'fail', message: 'Reply not found or awaiting moderation' }); 
    }

    // Determine current vote status
    const isUpvoted = reply.upvotes.some(id => id.equals(userIdObj));
    const isDownvoted = reply.downvotes.some(id => id.equals(userIdObj));

    // Prepare update operations
    let updateQuery = {};

    if (vote === 'up') {
        if (isUpvoted) {
            updateQuery = { $pull: { upvotes: userIdObj } };
        } else {
            updateQuery = { $addToSet: { upvotes: userIdObj }, $pull: { downvotes: userIdObj } };
        }
    } else { // vote === 'down'
        if (isDownvoted) {
            updateQuery = { $pull: { downvotes: userIdObj } };
        } else {
            updateQuery = { $addToSet: { downvotes: userIdObj }, $pull: { upvotes: userIdObj } };
        }
    }

    // Apply the update
    const updatedReply = await ForumReply.findByIdAndUpdate(
        req.params.id,
        updateQuery,
        { new: true }
    ).select('upvotes downvotes');

    if (!updatedReply) {
        return res.status(404).json({ status: 'fail', message: 'Reply not found during update' });
    }

    // Return vote counts
    res.status(200).json({
      status: 'success',
      data: {
        upvotes: updatedReply.upvotes.length,
        downvotes: updatedReply.downvotes.length
      }
    });
  } catch (err) {
    console.error("Error voting on reply:", err);
    next(err);
  }
};

// === Moderation Controllers ===

/**
 * @desc     Get topics pending moderation
 * @route    GET /api/forum/moderation/topics
 * @access   Private/Admin/Moderator
 */
exports.getPendingTopics = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Query for topics where isApproved is explicitly false (not using $ne to exclude null/undefined)
    const pendingTopicsQuery = ForumTopic.find({ isApproved: false })
      .populate('author', 'name')
      .populate('category', 'name color')
      .sort('-createdAt') // Newest first
      .skip(skip)
      .limit(limit);

    const totalCountQuery = ForumTopic.countDocuments({ isApproved: false });

    // Execute both queries in parallel
    const [pendingTopics, totalCount] = await Promise.all([pendingTopicsQuery, totalCountQuery]);

    res.status(200).json({
      status: 'success',
      results: pendingTopics.length,
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      data: { topics: pendingTopics }
    });
  } catch (err) {
    console.error("Error fetching pending topics:", err);
    next(err);
  }
};

/**
 * @desc     Get replies pending moderation
 * @route    GET /api/forum/moderation/replies
 * @access   Private/Admin/Moderator
 */
exports.getPendingReplies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Query for replies where isApproved is explicitly false
    const pendingRepliesQuery = ForumReply.find({ isApproved: false })
      .populate('author', 'name')
      .populate({
        path: 'topic',
        select: 'title category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort('-createdAt') // Newest first
      .skip(skip)
      .limit(limit);

    const totalCountQuery = ForumReply.countDocuments({ isApproved: false });

    // Execute both queries in parallel
    const [pendingReplies, totalCount] = await Promise.all([pendingRepliesQuery, totalCountQuery]);

    res.status(200).json({
      status: 'success',
      results: pendingReplies.length,
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      data: { replies: pendingReplies }
    });
  } catch (err) {
    console.error("Error fetching pending replies:", err);
    next(err);
  }
};

/**
 * @desc     Approve a topic
 * @route    PATCH /api/forum/moderation/topics/:id/approve
 * @access   Private/Admin/Moderator
 */
exports.approveTopic = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }

    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Skip if already approved
    if (topic.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Topic is already approved' });
    }

    // Update topic with approval info
    topic.isApproved = true;
    topic.moderatedBy = req.user.id;
    topic.moderationDate = new Date();
    await topic.save();

    // Update category counters now that the topic is approved and visible
    await ForumCategory.findByIdAndUpdate(topic.category, {
      $inc: { topicsCount: 1, postsCount: 1 }
    });

    res.status(200).json({
      status: 'success',
      message: 'Topic has been approved and published',
      data: { topic }
    });
  } catch (err) {
    console.error("Error approving topic:", err);
    next(err);
  }
};

/**
 * @desc     Reject a topic
 * @route    PATCH /api/forum/moderation/topics/:id/reject
 * @access   Private/Admin/Moderator
 */
exports.rejectTopic = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ status: 'fail', message: 'Rejection reason is required' });
    }

    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Skip if already approved (can't reject an approved topic)
    if (topic.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Cannot reject an already approved topic' });
    }

    // Delete the topic instead of keeping rejected topics
    await ForumTopic.findByIdAndDelete(topic._id);

    // We could alternatively keep rejected topics with a status field:
    // topic.isRejected = true;
    // topic.moderationMessage = reason;
    // topic.moderatedBy = req.user.id;
    // topic.moderationDate = new Date();
    // await topic.save();

    res.status(200).json({
      status: 'success',
      message: 'Topic has been rejected and removed',
    });
  } catch (err) {
    console.error("Error rejecting topic:", err);
    next(err);
  }
};

/**
 * @desc     Approve a reply
 * @route    PATCH /api/forum/moderation/replies/:id/approve
 * @access   Private/Admin/Moderator
 */
exports.approveReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' });
    }

    const reply = await ForumReply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ status: 'fail', message: 'Reply not found' });
    }

    // Skip if already approved
    if (reply.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Reply is already approved' });
    }

    // Update reply with approval info
    reply.isApproved = true;
    reply.moderatedBy = req.user.id;
    reply.moderationDate = new Date();
    await reply.save();

    // Get the associated topic
    const topic = await ForumTopic.findById(reply.topic);
    if (topic) {
      // Update topic stats
      topic.repliesCount = (topic.repliesCount || 0) + 1;
      if (!topic.lastReplyAt || new Date(reply.createdAt) > new Date(topic.lastReplyAt)) {
        topic.lastReplyAt = reply.createdAt;
      }
      await topic.save({ validateBeforeSave: false });

      // Update category posts count
      await ForumCategory.findByIdAndUpdate(topic.category, { $inc: { postsCount: 1 } });
    }

    res.status(200).json({
      status: 'success',
      message: 'Reply has been approved and published',
      data: { reply }
    });
  } catch (err) {
    console.error("Error approving reply:", err);
    next(err);
  }
};

/**
 * @desc     Reject a reply
 * @route    PATCH /api/forum/moderation/replies/:id/reject
 * @access   Private/Admin/Moderator
 */
exports.rejectReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ status: 'fail', message: 'Rejection reason is required' });
    }

    const reply = await ForumReply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ status: 'fail', message: 'Reply not found' });
    }

    // Skip if already approved (can't reject an approved reply)
    if (reply.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Cannot reject an already approved reply' });
    }

    // Delete the reply instead of keeping rejected replies
    await ForumReply.findByIdAndDelete(reply._id);

    res.status(200).json({
      status: 'success',
      message: 'Reply has been rejected and removed',
    });
  } catch (err) {
    console.error("Error rejecting reply:", err);
    next(err);
  }
};
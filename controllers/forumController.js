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
exports.getCategories = async (req, res, next) => { // Added next for consistency
  try {
    const categories = await ForumCategory.find();
    res.status(200).json({
        status: 'success', // Using status/data structure
        results: categories.length,
        data: { categories }
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    next(err); // Pass to general error handler
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
        // Attempt a simple gradient generation (e.g., slightly darker/lighter or transparent)
        // This is a basic example, adjust logic as needed
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
    if (err.code === 11000) { // Duplicate key error
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') { // Mongoose validation error
         const errors = Object.values(err.errors).map(el => el.message);
         const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err); // Pass other errors to general handler
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
        { new: true, runValidators: true } // Return updated doc, run validators
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
    if (err.code === 11000) { // Duplicate key error
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') { // Mongoose validation error
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err); // Pass other errors to general handler
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

    res.status(204).json({ // 204 No Content for successful deletion
        status: 'success',
        data: null
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    next(err); // Pass errors to general handler
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

    // Fetch topic and increment views atomically (optional, simple increment shown)
    const topic = await ForumTopic.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } }, // Increment views
        { new: false } // Return original doc before increment for view count consistency if needed immediately, or true to get updated count
      )
      .populate('author', 'name') // Populate author name
      .populate('category', 'name color'); // Populate category details

    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Fetch replies separately
    const replies = await ForumReply.find({ topic: req.params.id })
      .populate('author', 'name') // Populate reply author names
      .sort('createdAt'); // Sort replies chronologically

    // If using new: false above, manually add 1 to the view count for the response
    // topic.views = (topic.views || 0) + 1; // If needed

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
  // --- DEBUG LOG ---
  // Log user details *immediately* after protect middleware runs
  console.log('[Create Topic Controller] Function start. req.user:', req.user ? `ID: ${req.user.id}, Role: ${req.user.role}` : 'req.user is NOT DEFINED!');

  try {
    const { title, content, category } = req.body;

    // Check if req.user exists *before* accessing req.user.id
    if (!req.user || !req.user.id) {
        console.error('[Create Topic Controller] User not found on request object! Cannot proceed.');
        // Ensure response is sent if req.user is missing (should have been caught by middleware, but good failsafe)
        return res.status(401).json({ status: 'fail', message: 'User not authenticated (controller check).' });
    }
    const authorId = req.user.id; // Get ID safely after check
    // --- DEBUG LOG ---
    console.log(`[Create Topic Controller] Attempting to create topic with author ID: ${authorId}`); // Log the ID being used

    // --- Validation ---
    if (!title || !content || !category) {
        console.error('[Create Topic Controller] Validation failed: Missing title, content, or category.');
        return res.status(400).json({ status: 'fail', message: 'Title, content, and category are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
        console.error(`[Create Topic Controller] Validation failed: Invalid category ID format: ${category}`);
        return res.status(400).json({ status: 'fail', message: 'Invalid category ID format.' });
    }

    // --- Check Category ---
    const categoryExists = await ForumCategory.findById(category);
    if (!categoryExists) {
        console.error(`[Create Topic Controller] Category not found for ID: ${category}`);
        return res.status(404).json({ status: 'fail', message: 'Category not found.' });
    }

    // --- Create Topic ---
    const newTopic = await ForumTopic.create({
      title,
      content,
      category,
      author: authorId // Use the variable holding the checked user ID
    });
    console.log(`[Create Topic Controller] Topic created successfully with ID: ${newTopic._id}, Author: ${newTopic.author}`);

    // --- Update Category Stats ---
    try {
        // Increment both topic count and post count (topic itself is a post)
        await ForumCategory.findByIdAndUpdate(category, {
            $inc: { topicsCount: 1, postsCount: 1 }
        });
        console.log(`[Create Topic Controller] Updated counts for category ${category}`);
    } catch (updateErr) {
        console.error(`[Create Topic Controller] Error updating category counts for ${category}:`, updateErr);
        // Decide if this error should prevent success response (probably not critical)
    }


    res.status(201).json({ status: 'success', data: { topic: newTopic } });

  } catch (err) {
    console.error("[Create Topic Controller] General error creating topic:", err);
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    // Pass to general error handler if not handled specifically
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
    const limit = parseInt(req.query.limit, 10) || 20; // Default limit
    const skip = (page - 1) * limit;

    // Find topics for the category
    const topicsQuery = ForumTopic.find({ category: req.params.categoryId })
      .populate('author', 'name') // Populate author's name
      .sort('-isPinned -lastReplyAt -createdAt') // Sort pinned first, then by activity/creation
      .skip(skip)
      .limit(limit);

    // Count total topics for pagination
    const totalTopicsQuery = ForumTopic.countDocuments({ category: req.params.categoryId });

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
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' }); }

    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) { return res.status(404).json({ status: 'fail', message: 'Topic not found' }); }

    // --- Permission Check ---
    // Example: Allow topic author or admin/moderator to delete
    // if (req.user.id !== topic.author.toString() && !['admin', 'moderator'].includes(req.user.role)) {
    //    return res.status(403).json({ status: 'fail', message: 'You do not have permission to delete this topic.' });
    // }
    // For now, assuming restrictTo middleware handled permissions

    const categoryId = topic.category;

    // Delete associated replies
    const deletedRepliesResult = await ForumReply.deleteMany({ topic: req.params.id });
    console.log(`Deleted ${deletedRepliesResult.deletedCount} replies for topic ${req.params.id}`);

    // Delete the topic itself
    await ForumTopic.findByIdAndDelete(req.params.id);
    console.log(`Deleted topic ${req.params.id}`);

    // Update category stats (decrement topics and posts count)
    // Posts count decreases by 1 (the topic) + number of deleted replies
    const postsDecrement = 1 + (deletedRepliesResult.deletedCount || 0);
    await ForumCategory.findByIdAndUpdate(categoryId, {
      $inc: { topicsCount: -1, postsCount: -postsDecrement }
    });
    console.log(`Updated category ${categoryId} stats: topics -1, posts -${postsDecrement}`);

    res.status(200).json({ status: 'success', message: 'Topic and replies deleted successfully.' }); // Send 200 OK with message
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

    if (!mongoose.Types.ObjectId.isValid(topicId)) { return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' }); }
    if (!content) { return res.status(400).json({ status: 'fail', message: 'Reply content is required.' }); }
    if (!req.user || !req.user.id) { return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) { return res.status(404).json({ status: 'fail', message: 'Topic not found.' }); }
    if (topic.isLocked) { return res.status(403).json({ status: 'fail', message: 'Topic is locked, cannot add replies.' }); }

    const newReply = await ForumReply.create({
        content,
        topic: topicId,
        author: req.user.id
    });

    // Update topic stats (replies count, last reply time)
    topic.repliesCount = (topic.repliesCount || 0) + 1;
    topic.lastReplyAt = newReply.createdAt; // Use the reply's creation time
    await topic.save({ validateBeforeSave: false }); // Save topic changes

    // Update category posts count
    await ForumCategory.findByIdAndUpdate(topic.category, { $inc: { postsCount: 1 } });

    // Populate author details for the response
    const populatedReply = await ForumReply.findById(newReply._id).populate('author', 'name');

    res.status(201).json({ status: 'success', data: { reply: populatedReply } });
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
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' }); }
     if (!req.user || !req.user.id) { return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); }

    const reply = await ForumReply.findById(req.params.id);
    if (!reply) { return res.status(404).json({ status: 'fail', message: 'Reply not found' }); }

    const topic = await ForumTopic.findById(reply.topic);
    if (!topic) { return res.status(404).json({ status: 'fail', message: 'Associated topic not found' }); }

    // Check if the logged-in user is the author of the topic
    if (topic.author.toString() !== req.user.id) {
        return res.status(403).json({ status: 'fail', message: 'Only the topic author can mark the best answer' });
    }

    // Determine the new status (toggle)
    const newBestAnswerStatus = !reply.isBestAnswer;

    // Use a transaction for atomicity if preferred, simple update shown here
    // Unset other best answers for this topic first
    await ForumReply.updateMany(
        { topic: reply.topic, _id: { $ne: reply._id } }, // Exclude the current reply
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' }); }
    if (!req.user || !req.user.id) { return res.status(401).json({ status: 'fail', message: 'User not authenticated.' }); }

    const { vote } = req.body; // Expect 'up' or 'down'
    if (vote !== 'up' && vote !== 'down') {
        return res.status(400).json({ status: 'fail', message: 'Vote must be either "up" or "down"' });
    }

    const userId = req.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId); // Convert to ObjectId for comparison/update

    // Find the reply and select only vote arrays for efficiency
    const reply = await ForumReply.findById(req.params.id).select('upvotes downvotes');
    if (!reply) { return res.status(404).json({ status: 'fail', message: 'Reply not found' }); }

    // Determine current vote status
    const isUpvoted = reply.upvotes.some(id => id.equals(userIdObj));
    const isDownvoted = reply.downvotes.some(id => id.equals(userIdObj));

    // Prepare update operations using $pull and $addToSet for atomicity
    let updateQuery = {};

    if (vote === 'up') {
        if (isUpvoted) {
            // User is removing their upvote
            updateQuery = { $pull: { upvotes: userIdObj } };
        } else {
            // User is adding an upvote (remove downvote if exists)
            updateQuery = { $addToSet: { upvotes: userIdObj }, $pull: { downvotes: userIdObj } };
        }
    } else { // vote === 'down'
        if (isDownvoted) {
            // User is removing their downvote
            updateQuery = { $pull: { downvotes: userIdObj } };
        } else {
            // User is adding a downvote (remove upvote if exists)
            updateQuery = { $addToSet: { downvotes: userIdObj }, $pull: { upvotes: userIdObj } };
        }
    }

    // Apply the update and get the new document
    const updatedReply = await ForumReply.findByIdAndUpdate(
        req.params.id,
        updateQuery,
        { new: true } // Return the modified document
    ).select('upvotes downvotes'); // Select only needed fields for response

    if (!updatedReply) {
        // Should not happen if findById found it earlier, but good practice
        return res.status(404).json({ status: 'fail', message: 'Reply not found during update' });
    }

    // Respond with the new vote counts
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

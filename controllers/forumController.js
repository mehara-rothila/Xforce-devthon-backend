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
    next(err); // Pass error to Express error handler
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
        // Simple gradient generation (adjust logic if needed)
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
    if (err.code === 11000) { // Handle duplicate key error for name
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') { // Handle Mongoose validation errors
         const errors = Object.values(err.errors).map(el => el.message);
         const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err); // Pass other errors
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
    if (err.code === 11000) { // Handle potential duplicate name on update
        return res.status(400).json({ status: 'fail', message: 'Category name already exists.' });
    }
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        return res.status(400).json({ status: 'fail', message });
    }
    next(err); // Pass other errors
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

    // --- DEFENSIVE req.user CHECK ---
    // Check if user exists AND has a specific role before adding the isApproved filter
    // This prevents trying to access .role on undefined if req.user is not set
    const isModeratorOrAdmin = req.user && ['admin', 'moderator'].includes(req.user.role);
    if (!isModeratorOrAdmin) {
        query.isApproved = true; // Only show approved topics to guests/regular users
    }
    // --- END CHECK ---

    console.log(`[getTopicById] Fetching topic with query:`, JSON.stringify(query)); // Add Logging

    // Fetch topic and increment views atomically
    const topic = await ForumTopic.findOneAndUpdate(
        query,
        { $inc: { views: 1 } },
        { new: false } // Returns the doc *before* update
      )
      .populate('author', 'name') // Populate author name
      .populate('category', 'name color') // Populate category name and color
      .populate('moderatedBy', 'name'); // Populate moderator name (might be null)

    console.log(`[getTopicById] Topic found:`, topic ? topic._id : 'Not Found/Not Approved'); // Add Logging

    if (!topic) {
      // If query included isApproved=true, this means topic is not found OR not approved
      // If query didn't include isApproved, it means topic not found
      return res.status(404).json({
        status: 'fail',
        message: 'Topic not found or awaiting moderation'
      });
    }

    // For replies, also filter by approval status for non-admin/mod users
    const replyQuery = { topic: req.params.id };
    if (!isModeratorOrAdmin) { // Use the same defensive check as above
        replyQuery.isApproved = true;
    }

    console.log(`[getTopicById] Fetching replies with query:`, JSON.stringify(replyQuery)); // Add Logging

    // Fetch replies separately
    const replies = await ForumReply.find(replyQuery)
      .populate('author', 'name') // Populate author name
      .populate('moderatedBy', 'name') // Populate moderator name (might be null)
      .sort('createdAt'); // Sort replies by creation date

    console.log(`[getTopicById] Found ${replies.length} replies.`); // Add Logging

    res.status(200).json({
      status: 'success',
      data: { topic, replies } // Send both topic and replies
    });
  } catch (err) {
     // Log the specific error on the server
     console.error(`[getTopicById] Error fetching topic ${req.params.id}:`, err);
     // Provide a generic error message to the client
     const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'An internal server error occurred while fetching the topic.';
     // Ensure status isn't sent twice if error happens after res.status(200) somehow
     if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: errorMessage });
     }
     // Don't call next(err) if we've sent a response
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

    // Validate user is authenticated (ensure protect middleware ran)
    if (!req.user || !req.user.id) {
        return res.status(401).json({ status: 'fail', message: 'User not authenticated. Please log in.' });
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
    const isAutoApproved = req.user && ['admin', 'moderator'].includes(req.user.role); // Defensive check

    // Create topic with approval status
    const newTopic = await ForumTopic.create({
      title,
      content,
      category,
      author: authorId,
      isApproved: isAutoApproved,
      // If auto-approved, set moderation info (optional)
      // moderatedBy: isAutoApproved ? authorId : undefined,
      // moderationDate: isAutoApproved ? new Date() : undefined
    });

    // Update category stats ONLY if topic is auto-approved
    if (isAutoApproved) {
        try {
            await ForumCategory.findByIdAndUpdate(category, {
                $inc: { topicsCount: 1, postsCount: 1 } // Increment topic and post count
            });
        } catch (updateErr) {
            // Log error but don't fail the request just because stats update failed
            console.error(`Error updating category counts for ${category} after topic creation:`, updateErr);
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
    next(err); // Pass other errors
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

    // Build query - for normal users, only show approved topics
    const query = { category: req.params.categoryId };
    const isModeratorOrAdmin = req.user && ['admin', 'moderator'].includes(req.user.role); // Defensive check
    if (!isModeratorOrAdmin) {
        query.isApproved = true;
    }

    // Find topics for the category
    const topicsQuery = ForumTopic.find(query)
      .populate('author', 'name') // Populate author name
      .sort('-isPinned -lastReplyAt -createdAt') // Sort by pinned, then last reply, then creation
      .skip(skip)
      .limit(limit);

    // Count total topics matching the query for pagination
    const totalTopicsQuery = ForumTopic.countDocuments(query);

    // Execute queries concurrently
    const [topics, totalTopics] = await Promise.all([topicsQuery, totalTopicsQuery]);

    res.status(200).json({
        status: 'success',
        results: topics.length, // Results on current page
        totalResults: totalTopics, // Total matching topics
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

    // Find the topic first to get its category and approval status
    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) {
        return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    const categoryId = topic.category;
    const wasApproved = topic.isApproved; // Check approval status *before* deleting

    // Delete associated replies
    const deletedRepliesResult = await ForumReply.deleteMany({ topic: req.params.id });
    console.log(`Deleted ${deletedRepliesResult.deletedCount} replies for topic ${req.params.id}`);

    // Delete the topic itself
    await ForumTopic.findByIdAndDelete(req.params.id);
    console.log(`Deleted topic ${req.params.id}`);

    // Only update category stats if the topic *was* approved (and thus counted)
    if (wasApproved) {
        // Decrement topic count by 1
        // Decrement post count by 1 (for the topic) + number of *approved* replies (hard to know exactly after deletion)
        // For simplicity, we might just decrement by 1 for the topic, or estimate based on repliesCount
        // Recalculating counts periodically might be a better strategy.
        await ForumCategory.findByIdAndUpdate(categoryId, {
            $inc: { topicsCount: -1, postsCount: -1 } // Decrement counts
        });
    }

    res.status(200).json({ status: 'success', message: 'Topic and associated replies deleted successfully.' });
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

    // Get the topic - check if it exists, is approved, and not locked
    const topic = await ForumTopic.findOne({ _id: topicId, isApproved: true });
    if (!topic) {
        return res.status(404).json({ status: 'fail', message: 'Topic not found or awaiting moderation.' });
    }
    if (topic.isLocked) {
        return res.status(403).json({ status: 'fail', message: 'Topic is locked, cannot add replies.' });
    }

    // Auto-approve for admins/moderators
    const isAutoApproved = req.user && ['admin', 'moderator'].includes(req.user.role); // Defensive check

    // Create reply with appropriate approval status
    const newReply = await ForumReply.create({
        content,
        topic: topicId,
        author: req.user.id,
        isApproved: isAutoApproved,
        // moderatedBy: isAutoApproved ? req.user.id : undefined,
        // moderationDate: isAutoApproved ? new Date() : undefined
    });

    // Only update stats if reply is auto-approved
    if (isAutoApproved) {
        // Update topic stats (repliesCount and lastReplyAt)
        topic.repliesCount = (topic.repliesCount || 0) + 1;
        topic.lastReplyAt = newReply.createdAt;
        await topic.save({ validateBeforeSave: false }); // Save topic updates

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

    // Find the reply, ensuring it's approved
    const reply = await ForumReply.findOne({ _id: req.params.id, isApproved: true });
    if (!reply) {
        return res.status(404).json({ status: 'fail', message: 'Reply not found or awaiting moderation' });
    }

    // Find the associated topic to check authorship
    const topic = await ForumTopic.findById(reply.topic);
    if (!topic) {
        // This shouldn't happen if the reply exists, but good to check
        return res.status(404).json({ status: 'fail', message: 'Associated topic not found' });
    }

    // Authorization: Check if the logged-in user is the author of the topic
    if (topic.author.toString() !== req.user.id) {
        return res.status(403).json({ status: 'fail', message: 'Only the topic author can mark the best answer' });
    }

    // Determine the new status (toggle)
    const newBestAnswerStatus = !reply.isBestAnswer;

    // If marking as best, unset other best answers for this topic first
    if (newBestAnswerStatus) {
        await ForumReply.updateMany(
            { topic: reply.topic, _id: { $ne: reply._id } }, // Find others in the same topic
            { isBestAnswer: false } // Unset them
        );
    }

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
    const userIdObj = new mongoose.Types.ObjectId(userId); // Convert to ObjectId for comparison

    // Find the reply, ensuring it's approved, and select vote arrays
    const reply = await ForumReply.findOne({ _id: req.params.id, isApproved: true }).select('upvotes downvotes');
    if (!reply) {
        return res.status(404).json({ status: 'fail', message: 'Reply not found or awaiting moderation' });
    }

    // Determine current vote status using .some() and .equals() for ObjectId comparison
    const isUpvoted = reply.upvotes.some(id => id.equals(userIdObj));
    const isDownvoted = reply.downvotes.some(id => id.equals(userIdObj));

    // Prepare update operations using $pull and $addToSet for atomicity
    let updateQuery = {};

    if (vote === 'up') {
        if (isUpvoted) {
            // User is removing their upvote
            updateQuery = { $pull: { upvotes: userIdObj } };
        } else {
            // User is adding an upvote (and removing downvote if it exists)
            updateQuery = { $addToSet: { upvotes: userIdObj }, $pull: { downvotes: userIdObj } };
        }
    } else { // vote === 'down'
        if (isDownvoted) {
            // User is removing their downvote
            updateQuery = { $pull: { downvotes: userIdObj } };
        } else {
            // User is adding a downvote (and removing upvote if it exists)
            updateQuery = { $addToSet: { downvotes: userIdObj }, $pull: { upvotes: userIdObj } };
        }
    }

    // Apply the update and return the updated document
    const updatedReply = await ForumReply.findByIdAndUpdate(
        req.params.id,
        updateQuery,
        { new: true } // Return the modified document
    ).select('upvotes downvotes'); // Select only the vote arrays

    if (!updatedReply) {
        // Should not happen if the findOne worked, but handle defensively
        return res.status(404).json({ status: 'fail', message: 'Reply not found during update' });
    }

    // Return the new vote counts
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

// === Moderation Controllers (Consolidated) ===

/**
 * @desc     Get topics pending moderation
 * @route    GET /api/forum/moderation/pending-topics
 * @access   Private/Admin/Moderator
 */
exports.getPendingTopics = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Query for topics where isApproved is explicitly false
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
 * @route    GET /api/forum/moderation/pending-replies
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
        select: 'title category', // Select fields needed from topic
        populate: { // Nested populate for category within topic
          path: 'category',
          select: 'name' // Select fields needed from category
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
    if (!req.user || !req.user.id) { // Ensure moderator is logged in
        return res.status(401).json({ status: 'fail', message: 'Authentication required.' });
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
    topic.moderatedBy = req.user.id; // Record who approved it
    topic.moderationDate = new Date(); // Record when it was approved
    await topic.save();

    // Update category counters now that the topic is approved and visible
    await ForumCategory.findByIdAndUpdate(topic.category, {
      $inc: { topicsCount: 1, postsCount: 1 } // Increment both counts
    });

    res.status(200).json({
      status: 'success',
      message: 'Topic has been approved and published',
      data: { topic } // Send back the updated topic
    });
  } catch (err) {
    console.error("Error approving topic:", err);
    next(err);
  }
};

/**
 * @desc     Reject a topic
 * @route    DELETE /api/forum/moderation/topics/:id/reject  (Using DELETE as it removes the topic)
 * @access   Private/Admin/Moderator
 */
exports.rejectTopic = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }
    // Note: Rejection reason might be passed in query or body if needed for logging, but not used here.

    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Skip if already approved (can't reject an approved topic this way)
    if (topic.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Cannot reject an already approved topic via this endpoint. Use delete instead.' });
    }

    // Delete the topic (and potentially its replies if any were created before rejection)
    await ForumReply.deleteMany({ topic: topic._id }); // Delete replies first
    await ForumTopic.findByIdAndDelete(topic._id); // Then delete topic

    res.status(200).json({ // Use 200 OK with message, or 204 No Content
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
     if (!req.user || !req.user.id) { // Ensure moderator is logged in
        return res.status(401).json({ status: 'fail', message: 'Authentication required.' });
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
    reply.moderatedBy = req.user.id; // Record who approved it
    reply.moderationDate = new Date(); // Record when it was approved
    await reply.save();

    // Get the associated topic to update its stats
    const topic = await ForumTopic.findById(reply.topic);
    if (topic) {
      // Update topic stats (only if the topic itself is approved)
      if (topic.isApproved) {
          topic.repliesCount = (topic.repliesCount || 0) + 1;
          // Update lastReplyAt only if this reply is newer
          if (!topic.lastReplyAt || new Date(reply.createdAt) > new Date(topic.lastReplyAt)) {
            topic.lastReplyAt = reply.createdAt;
          }
          await topic.save({ validateBeforeSave: false }); // Save topic updates

          // Update category posts count
          await ForumCategory.findByIdAndUpdate(topic.category, { $inc: { postsCount: 1 } });
      } else {
          console.warn(`Approved reply ${reply._id} but parent topic ${topic._id} is not approved. Stats not updated yet.`);
      }
    } else {
        console.warn(`Could not find parent topic ${reply.topic} for approved reply ${reply._id}. Stats not updated.`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Reply has been approved and published',
      data: { reply } // Send back the updated reply
    });
  } catch (err) {
    console.error("Error approving reply:", err);
    next(err);
  }
};

/**
 * @desc     Reject a reply
 * @route    DELETE /api/forum/moderation/replies/:id/reject (Using DELETE as it removes the reply)
 * @access   Private/Admin/Moderator
 */
exports.rejectReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' });
    }
    // Note: Rejection reason might be passed in query or body if needed for logging

    const reply = await ForumReply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ status: 'fail', message: 'Reply not found' });
    }

    // Skip if already approved (can't reject an approved reply this way)
    if (reply.isApproved) {
      return res.status(400).json({ status: 'fail', message: 'Cannot reject an already approved reply via this endpoint. Use delete instead.' });
    }

    // Delete the reply
    await ForumReply.findByIdAndDelete(reply._id);

    res.status(200).json({ // Use 200 OK with message, or 204 No Content
      status: 'success',
      message: 'Reply has been rejected and removed',
    });
  } catch (err) {
    console.error("Error rejecting reply:", err);
    next(err);
  }
};
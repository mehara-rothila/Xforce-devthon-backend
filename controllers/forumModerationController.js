// controllers/forumModerationController.js
const ForumTopic = require('../models/forumTopicModel');
const ForumReply = require('../models/forumReplyModel');
const ForumCategory = require('../models/forumCategoryModel');
const mongoose = require('mongoose');

/**
 * @desc     Get Pending Topics
 * @route    GET /api/forum/moderation/pending-topics
 * @access   Private/Admin
 */
exports.getPendingTopics = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const topics = await ForumTopic.find({ isApproved: false })
      .populate('author', 'name')
      .populate('category', 'name color icon')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await ForumTopic.countDocuments({ isApproved: false });

    res.status(200).json({
      status: 'success',
      results: topics.length,
      totalResults: total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: { topics }
    });
  } catch (err) {
    console.error("Error fetching pending topics:", err);
    next(err);
  }
};

/**
 * @desc     Get Pending Replies
 * @route    GET /api/forum/moderation/pending-replies
 * @access   Private/Admin
 */
exports.getPendingReplies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const replies = await ForumReply.find({ isApproved: false })
      .populate('author', 'name')
      .populate({
        path: 'topic',
        select: 'title isApproved category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await ForumReply.countDocuments({ isApproved: false });

    res.status(200).json({
      status: 'success',
      results: replies.length,
      totalResults: total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: { replies }
    });
  } catch (err) {
    console.error("Error fetching pending replies:", err);
    next(err);
  }
};

/**
 * @desc     Approve Topic
 * @route    PATCH /api/forum/moderation/topics/:id/approve
 * @access   Private/Admin
 */
exports.approveTopic = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }

    const topic = await ForumTopic.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true, runValidators: true }
    );

    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Update category counts when approving a topic
    await ForumCategory.findByIdAndUpdate(topic.category, {
      $inc: { topicsCount: 1, postsCount: 1 }
    });

    res.status(200).json({
      status: 'success',
      data: { topic }
    });
  } catch (err) {
    console.error("Error approving topic:", err);
    next(err);
  }
};

/**
 * @desc     Reject Topic
 * @route    DELETE /api/forum/moderation/topics/:id/reject
 * @access   Private/Admin
 */
exports.rejectTopic = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid topic ID format.' });
    }

    // Delete the topic and its replies
    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ status: 'fail', message: 'Topic not found' });
    }

    // Delete all replies associated with this topic
    await ForumReply.deleteMany({ topic: req.params.id });
    
    // Delete the topic itself
    await ForumTopic.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Topic and associated replies have been rejected and deleted.'
    });
  } catch (err) {
    console.error("Error rejecting topic:", err);
    next(err);
  }
};

/**
 * @desc     Approve Reply
 * @route    PATCH /api/forum/moderation/replies/:id/approve
 * @access   Private/Admin
 */
exports.approveReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' });
    }

    const reply = await ForumReply.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true, runValidators: true }
    ).populate('topic');

    if (!reply) {
      return res.status(404).json({ status: 'fail', message: 'Reply not found' });
    }

    // Update topic's lastReplyAt and repliesCount
    const topic = await ForumTopic.findByIdAndUpdate(
      reply.topic._id,
      { 
        lastReplyAt: reply.createdAt,
        $inc: { repliesCount: 1 }
      },
      { new: true }
    );

    // Update category posts count
    await ForumCategory.findByIdAndUpdate(
      topic.category,
      { $inc: { postsCount: 1 } }
    );

    res.status(200).json({
      status: 'success',
      data: { reply }
    });
  } catch (err) {
    console.error("Error approving reply:", err);
    next(err);
  }
};

/**
 * @desc     Reject Reply
 * @route    DELETE /api/forum/moderation/replies/:id/reject
 * @access   Private/Admin
 */
exports.rejectReply = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid reply ID format.' });
    }

    const reply = await ForumReply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ status: 'fail', message: 'Reply not found' });
    }

    // Delete the reply
    await ForumReply.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Reply has been rejected and deleted.'
    });
  } catch (err) {
    console.error("Error rejecting reply:", err);
    next(err);
  }
};
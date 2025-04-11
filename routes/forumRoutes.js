const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const forumModerationController = require('../controllers/forumModerationController');

// Assuming your auth middleware provides protect (authentication)
// and restrictTo (authorization based on roles like 'admin')
const { protect, restrictTo } = require('../middleware/authMiddleware');

// --- Public Routes ---
// Anyone can view categories, topics lists, and individual topics/replies
router.get('/categories', forumController.getCategories);
router.get('/categories/:categoryId/topics', forumController.getTopicsByCategory);
router.get('/topics/:id', forumController.getTopicById); // Gets topic and its replies

// --- Protected Routes (Require User Login) ---
// Apply 'protect' middleware to all subsequent routes
router.use(protect);

router.post('/topics', forumController.createTopic); // Create a new topic
router.post('/topics/:topicId/replies', forumController.addReply); // Add a reply
router.patch('/replies/:id/best', forumController.markBestAnswer); // Mark best answer (controller checks if user is topic author)
router.post('/replies/:id/vote', forumController.voteReply); // Vote on a reply

// --- Admin Routes (Require Admin Role) ---
// Apply 'restrictTo' middleware for admin-only actions
router.use('/moderation', restrictTo('admin'));

// Moderation routes - Fixed to match the API client's expected endpoints
router.get(
    '/moderation/pending-topics',
    forumModerationController.getPendingTopics
);

router.get(
    '/moderation/pending-replies',
    forumModerationController.getPendingReplies
);

router.patch(
    '/moderation/topics/:id/approve',
    forumModerationController.approveTopic
);

router.delete(
    '/moderation/topics/:id/reject',
    forumModerationController.rejectTopic
);

router.patch(
    '/moderation/replies/:id/approve',
    forumModerationController.approveReply
);

router.delete(
    '/moderation/replies/:id/reject',
    forumModerationController.rejectReply
);

// Add category management routes (admin only)
router.post('/categories', restrictTo('admin'), forumController.createCategory);
router.patch('/categories/:id', restrictTo('admin'), forumController.updateCategory);
router.delete('/categories/:id', restrictTo('admin'), forumController.deleteCategory);

// Admin route for topic deletion
router.delete('/topics/:id', restrictTo('admin', 'moderator'), forumController.deleteTopic);

module.exports = router;
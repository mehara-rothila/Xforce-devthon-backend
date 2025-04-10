const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
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

// Category Management (Admin Only)
router.post(
    '/categories',
    restrictTo('admin'), // Only admins can create categories
    forumController.createCategory
);
router.patch(
    '/categories/:id',
    restrictTo('admin'), // Only admins can update categories
    forumController.updateCategory
);
router.delete(
    '/categories/:id',
    restrictTo('admin'), // Only admins can delete categories
    forumController.deleteCategory
);

// Topic Management (Admin/Moderator - adjust roles as needed)
router.delete(
    '/topics/:id',
    restrictTo('admin', 'moderator'), // Admins or moderators can delete topics
    forumController.deleteTopic
);

// Potential Future Admin Routes for Topics/Replies:
// router.patch('/topics/:id/pin', restrictTo('admin', 'moderator'), forumController.pinTopic);
// router.patch('/topics/:id/lock', restrictTo('admin', 'moderator'), forumController.lockTopic);
// router.delete('/replies/:id', restrictTo('admin', 'moderator'), forumController.deleteReply);


module.exports = router;
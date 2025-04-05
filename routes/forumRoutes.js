const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/categories', forumController.getCategories);
router.get('/categories/:categoryId/topics', forumController.getTopicsByCategory);
router.get('/topics/:id', forumController.getTopicById);

// Protected routes
router.use(protect);

router.post('/topics', forumController.createTopic);
router.post('/topics/:topicId/replies', forumController.addReply);
router.patch('/replies/:id/best', forumController.markBestAnswer);
router.post('/replies/:id/vote', forumController.voteReply);

// Admin routes
router.delete('/topics/:id', 
  protect, 
  restrictTo('admin', 'moderator'), 
  forumController.deleteTopic
);

module.exports = router;
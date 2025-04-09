// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.get('/subject/:subjectId/practice', quizController.getPracticeQuizzes);

// User attempts 
// Temporarily disable auth to test functionality
router.post('/:id/attempts', quizController.submitQuizAttempt);
// After testing, you can enable auth with:
// router.post('/:id/attempts', protect, quizController.submitQuizAttempt);

// Get user attempts
router.get('/user/:userId/attempts', protect, quizController.getUserQuizAttempts);

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', quizController.createQuiz);
router.patch('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
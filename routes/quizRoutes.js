const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.get('/subject/:subjectId/practice', quizController.getPracticeQuizzes);

// Protected routes
router.use(protect);
router.post('/:id/attempts', quizController.submitQuizAttempt);

// Admin only routes
router.use(restrictTo('admin'));

router.post('/', quizController.createQuiz);
router.patch('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
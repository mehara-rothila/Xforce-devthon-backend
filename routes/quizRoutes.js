// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// --- Public Routes ---
router.get('/', quizController.getAllQuizzes);
router.get('/subject/:subjectId/practice', quizController.getPracticeQuizzes);
router.get('/:id', quizController.getQuizById);


// --- Protected Routes (Require User Login) ---
router.post('/:id/attempts', protect, quizController.submitQuizAttempt);
router.get('/user/:userId/attempts', protect, quizController.getUserQuizAttempts);

// ***** ADD NEW ROUTE FOR RATING *****
// User must be logged in to rate a quiz they attempted
router.post('/:quizId/rate', protect, quizController.rateQuiz);

// ***** ADD NEW ROUTE FOR GETTING SINGLE ATTEMPT *****
// User must be logged in and own the attempt (or be admin) - controller handles authorization
router.get('/attempts/:id', protect, quizController.getQuizAttemptById);


// --- Admin Only Routes ---
// Apply protection and role restriction to all subsequent routes in this section
// Note: 'protect' is already applied individually above where needed for non-admin users.
// We only need restrictTo('admin') here for the admin-specific actions.
router.post('/', protect, restrictTo('admin'), quizController.createQuiz);
router.patch('/:id', protect, restrictTo('admin'), quizController.updateQuiz);
router.delete('/:id', protect, restrictTo('admin'), quizController.deleteQuiz);


module.exports = router;
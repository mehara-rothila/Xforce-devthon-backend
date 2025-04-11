// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); // Make sure protect is imported

// --- Public Routes ---
router.get('/', quizController.getAllQuizzes);
router.get('/subject/:subjectId/practice', quizController.getPracticeQuizzes);
router.get('/:id', quizController.getQuizById);


// --- Protected Routes (Require User Login) ---

// POST /api/quizzes/:id/attempts : Submit a user's attempt for a quiz
// ***** CORRECTED LINE: Apply the 'protect' middleware *****
router.post('/:id/attempts', protect, quizController.submitQuizAttempt);
// router.post('/:id/attempts', quizController.submitQuizAttempt); // <-- Comment out or delete this unprotected line

// GET /api/quizzes/user/:userId/attempts : Get attempts for a specific user
router.get('/user/:userId/attempts', protect, quizController.getUserQuizAttempts);


// --- Admin Only Routes ---
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', quizController.createQuiz);
router.patch('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);


module.exports = router;
// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController'); // Make sure controller is imported
// Adjust path based on your actual auth middleware location
const { protect, restrictTo } = require('../middleware/authMiddleware');

// --- Public Routes ---

// GET /api/quizzes : Get all quizzes with filtering/sorting/pagination
router.get('/', quizController.getAllQuizzes);

// GET /api/quizzes/subject/:subjectId/practice : Get practice quizzes for a subject
// NOTE: Place more specific routes BEFORE routes with general parameters like /:id
router.get('/subject/:subjectId/practice', quizController.getPracticeQuizzes);

// GET /api/quizzes/:id : Get a single quiz by its ID
router.get('/:id', quizController.getQuizById);


// --- Protected Routes (Require User Login) ---

// POST /api/quizzes/:id/attempts : Submit a user's attempt for a quiz
// Ensure 'protect' is applied if authentication is required
// router.post('/:id/attempts', protect, quizController.submitQuizAttempt); // Use this when ready
router.post('/:id/attempts', quizController.submitQuizAttempt); // Currently unprotected based on previous code

// GET /api/quizzes/user/:userId/attempts : Get attempts for a specific user
// Middleware should check if requester is the user or admin
router.get('/user/:userId/attempts', protect, quizController.getUserQuizAttempts);


// --- Admin Only Routes ---
// Apply protection and role restriction to all subsequent routes in this section
router.use(protect);
router.use(restrictTo('admin'));

// POST /api/quizzes : Create a new quiz
router.post('/', quizController.createQuiz);

// PATCH /api/quizzes/:id : Update an existing quiz
router.patch('/:id', quizController.updateQuiz);

// DELETE /api/quizzes/:id : Delete a quiz
router.delete('/:id', quizController.deleteQuiz);


module.exports = router;
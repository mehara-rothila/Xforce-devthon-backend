const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// @route   GET /api/quizzes
// @desc    Get all quizzes with optional filters
// @access  Public
router.get('/', quizController.getAllQuizzes);

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private
router.post('/', quizController.createQuiz);

// @route   GET /api/quizzes/:id
// @desc    Get quiz by ID
// @access  Public
router.get('/:id', quizController.getQuizById);

// @route   PATCH /api/quizzes/:id
// @desc    Update a quiz
// @access  Private
router.patch('/:id', quizController.updateQuiz);

// @route   DELETE /api/quizzes/:id
// @desc    Delete a quiz
// @access  Private
router.delete('/:id', quizController.deleteQuiz);

// @route   POST /api/quizzes/:id/attempts
// @desc    Submit a quiz attempt
// @access  Private
router.post('/:id/attempts', quizController.submitQuizAttempt);

module.exports = router;
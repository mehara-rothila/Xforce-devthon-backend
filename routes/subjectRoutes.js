const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');

// --- Debugging Logs ---
// Add these logs to check if the functions are correctly imported before defining routes
console.log("--- Checking Imported Functions for subjectRoutes.js ---");
console.log("Type of subjectController.getAllSubjects:", typeof subjectController.getAllSubjects);
console.log("Type of subjectController.getSubjectById:", typeof subjectController.getSubjectById);
console.log("Type of subjectController.getTopics:", typeof subjectController.getTopics);
console.log("Type of quizController.getQuizzesForSubject:", typeof quizController.getQuizzesForSubject);
console.log("Type of protect middleware:", typeof protect); // Check protect specifically
console.log("Type of subjectController.getUserProgress:", typeof subjectController.getUserProgress); // Check getUserProgress specifically
console.log("Type of subjectController.getRecommendedResources:", typeof subjectController.getRecommendedResources);
console.log("Type of restrictTo middleware:", typeof restrictTo);
console.log("Type of subjectController.createSubject:", typeof subjectController.createSubject);
console.log("Type of subjectController.updateSubject:", typeof subjectController.updateSubject);
console.log("Type of subjectController.deleteSubject:", typeof subjectController.deleteSubject);
console.log("Type of subjectController.addTopic:", typeof subjectController.addTopic);
console.log("Type of subjectController.updateTopic:", typeof subjectController.updateTopic);
console.log("Type of subjectController.deleteTopic:", typeof subjectController.deleteTopic);
console.log("--------------------------------------------------------");
// --- End Debugging Logs ---

// Public routes
router.get('/', subjectController.getAllSubjects);
router.get('/:id', subjectController.getSubjectById);
router.get('/:id/topics', subjectController.getTopics);
router.get('/:id/quizzes', quizController.getQuizzesForSubject);

// Protected routes - require login
// Line 14 where the original error likely occurred:
router.get('/:id/progress', protect, subjectController.getUserProgress);
router.get('/:id/recommendations', protect, subjectController.getRecommendedResources);

// Admin only routes
router.use(protect); // Applying protect middleware to all subsequent routes in this file
router.use(restrictTo('admin')); // Applying admin restriction to all subsequent routes

router.post('/', subjectController.createSubject);
router.patch('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);
router.post('/:id/topics', subjectController.addTopic);
router.patch('/:id/topics/:topicId', subjectController.updateTopic);
router.delete('/:id/topics/:topicId', subjectController.deleteTopic);

module.exports = router;
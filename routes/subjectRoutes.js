const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.get('/', subjectController.getAllSubjects);
router.get('/:id', subjectController.getSubjectById);
router.get('/:id/topics', subjectController.getTopics);
router.get('/:id/quizzes', quizController.getQuizzesForSubject);

// Protected routes - require login
router.get('/:id/progress', protect, subjectController.getUserProgress);
router.get('/:id/recommendations', protect, subjectController.getRecommendedResources);

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', subjectController.createSubject);
router.patch('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);
router.post('/:id/topics', subjectController.addTopic);
router.patch('/:id/topics/:topicId', subjectController.updateTopic);
router.delete('/:id/topics/:topicId', subjectController.deleteTopic);

module.exports = router;
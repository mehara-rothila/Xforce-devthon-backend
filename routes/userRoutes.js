// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// --- Leaderboard Route (IMPORTANT: This must come BEFORE any routes with path parameters) ---
router.get('/leaderboard', userController.getLeaderboard);

// --- Routes with User ID parameters ---
router.get('/:id', userController.getUserProfile);
router.patch('/:id', protect, userController.updateUserProfile);
router.get('/:id/progress', userController.getUserProgress);
router.get('/:userId/dashboard-summary', userController.getDashboardSummary);
router.get('/:userId/progress/:subjectId', userController.getDetailedSubjectProgress);
router.get('/:userId/achievements', userController.getUserAchievements);
router.get('/:userId/activity', userController.getRecentActivity);

module.exports = router;
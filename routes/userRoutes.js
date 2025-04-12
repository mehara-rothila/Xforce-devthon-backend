// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); // Make sure protect is imported

// --- Leaderboard Route (Public) ---
router.get('/leaderboard', userController.getLeaderboard);

// --- Routes requiring Authentication (Apply 'protect') ---

// GET User Profile
router.get('/:id', protect, userController.getUserProfile);

// PATCH User Profile
router.patch('/:id', protect, userController.updateUserProfile);

// GET User Progress (Overall)
router.get('/:id/progress', protect, userController.getUserProgress);

// GET Dashboard Summary
router.get('/:userId/dashboard-summary', protect, userController.getDashboardSummary);

// GET Detailed Subject Progress
router.get('/:userId/progress/:subjectId', protect, userController.getDetailedSubjectProgress);

// GET User Achievements
router.get('/:userId/achievements', protect, userController.getUserAchievements);

// GET User Recent Activity
router.get('/:userId/activity', protect, userController.getRecentActivity);

// *** ADD NEW ROUTE for Activity Dates ***
router.get('/:userId/activity-dates', protect, userController.getUserActivityDates);


// --- Admin Only Routes (Example - if needed later) ---
// router.get('/', protect, restrictTo('admin'), userController.getAllUsers); // Example

module.exports = router;
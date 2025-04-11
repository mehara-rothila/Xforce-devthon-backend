// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); // Make sure protect is imported

// --- Leaderboard Route (Public) ---
router.get('/leaderboard', userController.getLeaderboard);

// --- Routes requiring Authentication (Apply 'protect') ---

// GET User Profile (Public view possible, but protect needed for potential private data access within controller)
// Or make separate public/private routes if needed. Applying protect here is safer.
router.get('/:id', protect, userController.getUserProfile);

// PATCH User Profile (Must be logged in user or admin)
router.patch('/:id', protect, userController.updateUserProfile);

// GET User Progress (Must be logged in user or admin)
router.get('/:id/progress', protect, userController.getUserProgress);

// GET Dashboard Summary (Must be logged in user)
// Note: Controller already checks if req.user.id matches params.userId or if admin
router.get('/:userId/dashboard-summary', protect, userController.getDashboardSummary);

// GET Detailed Subject Progress (Must be logged in user or admin)
router.get('/:userId/progress/:subjectId', protect, userController.getDetailedSubjectProgress);

// GET User Achievements (Must be logged in user or admin)
router.get('/:userId/achievements', protect, userController.getUserAchievements);

// GET User Recent Activity (Must be logged in user or admin)
// ***** ADD 'protect' MIDDLEWARE HERE *****
router.get('/:userId/activity', protect, userController.getRecentActivity);


// --- Admin Only Routes (Example - if needed later) ---
// router.get('/', protect, restrictTo('admin'), userController.getAllUsers); // Example

module.exports = router;
// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const { protect } = require('../middleware/auth'); // Apply later

// --- Existing Routes ---
router.get('/:id', userController.getUserProfile); // Placeholder
router.patch('/:id', userController.updateUserProfile); // Placeholder
router.get('/:id/progress', userController.getUserProgress); // Placeholder
router.get('/:userId/dashboard-summary', userController.getDashboardSummary); // Implemented (temp user ID)
router.get('/:userId/progress/:subjectId', userController.getDetailedSubjectProgress); // Implemented (temp user ID)

// --- NEW ACHIEVEMENTS TAB ROUTE ---
// @route   GET /api/users/:userId/achievements
// @desc    Get all achievements and user's unlocked status
// @access  Private (Temporary: Public for testing without auth)
router.get('/:userId/achievements', userController.getUserAchievements); // New function

module.exports = router;

// routes/achievementRoutes.js
const express = require('express');
const achievementController = require('../controllers/achievementController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin routes for managing achievements
router.use(protect);
router.use(restrictTo('admin'));

router.route('/')
  .get(achievementController.getAllAchievements)
  .post(achievementController.createAchievement);

router.route('/:id')
  .patch(achievementController.updateAchievement)
  .delete(achievementController.deleteAchievement);

module.exports = router;
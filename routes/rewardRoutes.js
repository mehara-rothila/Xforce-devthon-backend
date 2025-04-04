// Reward routes 
const express = require('express');
const router = express.Router();
// const rewardController = require('../controllers/rewardController'); // Uncomment when controller is implemented

// @route   GET /api/rewards
// @desc    Get all rewards with optional filters
// @access  Public
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all rewards' });
  // Will be replaced with: rewardController.getAllRewards
});

// @route   POST /api/rewards/:id/redeem
// @desc    Redeem a reward
// @access  Private
router.post('/:id/redeem', (req, res) => {
  res.status(200).json({ message: `Redeem reward with ID: ${req.params.id}` });
  // Will be replaced with: rewardController.redeemReward
});

// @route   GET /api/rewards/user/:id
// @desc    Get user's redeemed rewards
// @access  Private
router.get('/user/:id', (req, res) => {
  res.status(200).json({ message: `Get rewards for user ID: ${req.params.id}` });
  // Will be replaced with: rewardController.getUserRewards
});

module.exports = router;
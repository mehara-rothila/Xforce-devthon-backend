const express = require('express');
const rewardController = require('../controllers/rewardController');
const { protect, restrictTo } = require('../middleware/auth'); // Import auth middleware

const router = express.Router();

// --- Public Routes ---
// Anyone can view the list of available rewards and details of a single reward
router.get('/', rewardController.getAllRewards);
router.get('/:id', rewardController.getRewardById);

// --- Protected Routes (Require User Login) ---
// Apply 'protect' middleware to all subsequent routes in this file
router.use(protect);

// Logged-in users can attempt to redeem a reward
router.post('/:id/redeem', rewardController.redeemReward);

// --- Admin Routes (Require Admin Role) ---
// Apply 'restrictTo' middleware for admin-only actions
// These routes are chained after the 'protect' middleware above

router.post(
    '/',
    restrictTo('admin'), // Only admins can create rewards
    rewardController.createReward
);

router.patch(
    '/:id',
    restrictTo('admin'), // Only admins can update rewards
    rewardController.updateReward
);

router.delete(
    '/:id',
    restrictTo('admin'), // Only admins can delete rewards
    rewardController.deleteReward
);


module.exports = router;
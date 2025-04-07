const mongoose = require('mongoose');
const Reward = require('../models/rewardModel');
const User = require('../models/userModel'); // Assuming you have a User model for points

// --- Helper Functions (Consider moving to a utils file) ---
const handleAsyncError = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// --- Public Controllers ---

/**
 * @desc    Get All Rewards (Filtered, Sorted, Paginated)
 * @route   GET /api/rewards
 * @access  Public
 */
exports.getAllRewards = handleAsyncError(async (req, res, next) => {
    // --- Filtering ---
    let queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Filter only active rewards for public view
    queryObj.isActive = true;

    // Handle text search (on name and description)
    if (req.query.search) {
        queryObj.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // Handle category filter
    if (req.query.category && req.query.category !== 'all') {
        queryObj.category = req.query.category;
    }

    // --- NEW: Handle Subject Filter ---
    if (req.query.subject) {
        // Assuming filtering by a single subject ID for now
        if (mongoose.Types.ObjectId.isValid(req.query.subject)) {
            queryObj.subject = req.query.subject; // Add subject ID to the filter
        } else {
            console.warn("Invalid Subject ID received for filtering rewards:", req.query.subject);
            // If an invalid subject ID is provided, return no results for that filter
            queryObj._id = null; // Or handle as needed (e.g., ignore the filter)
        }
        // Note: If you need to filter by MULTIPLE subjects later, adapt the logic
        // similar to how it's done in resourceController/quizController (split comma-separated IDs, use $in).
    }
    // --- End Subject Filter ---

    // --- Total Count ---
    const totalResults = await Reward.countDocuments(queryObj);

    // --- Main Query Execution ---
    let query = Reward.find(queryObj);

    // --- Sorting ---
    if (req.query.sort) {
        let sortBy = req.query.sort;
        if (sortBy === 'points-asc') sortBy = 'pointsCost';
        else if (sortBy === 'points-desc') sortBy = '-pointsCost';
        else if (sortBy === 'newest') sortBy = '-createdAt';
        else if (sortBy === 'az') sortBy = 'name';
        const sortQuery = sortBy.split(',').join(' ');
        query = query.sort(sortQuery);
    } else {
        query = query.sort('-isPopular -pointsCost -createdAt');
    }

    // --- Field Limiting --- (Optional)
    // query = query.select('-__v');

    // --- Pagination ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Optional: Populate subject if needed, but maybe not for general list view
    // query = query.populate('subject', 'name');

    // Execute query
    const rewards = await query;

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit) || 1;

    // --- Send Response ---
    res.status(200).json({
        status: 'success',
        totalResults: totalResults,
        results: rewards.length,
        totalPages: totalPages,
        currentPage: page,
        data: {
            rewards
        }
    });
});

/**
 * @desc    Get Single Reward by ID
 * @route   GET /api/rewards/:id
 * @access  Public
 */
exports.getRewardById = handleAsyncError(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid reward ID format.' });
    }
    // Populate subject details when fetching a single reward
    const reward = await Reward.findOne({ _id: req.params.id, isActive: true })
                                .populate('subject', 'name'); // Populate subject name

    if (!reward) {
        return res.status(404).json({ status: 'fail', message: 'Reward not found or not active.' });
    }
    res.status(200).json({ status: 'success', data: { reward } });
});


// --- User Actions ---

/**
 * @desc    Redeem a Reward
 * @route   POST /api/rewards/:id/redeem
 * @access  Private (User must be logged in)
 */
exports.redeemReward = handleAsyncError(async (req, res, next) => {
    const rewardId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(rewardId)) { return res.status(400).json({ status: 'fail', message: 'Invalid reward ID format.' }); }

    // TODO: Implement using Mongoose Transactions for atomicity

    const reward = await Reward.findById(rewardId);
    if (!reward) { return res.status(404).json({ status: 'fail', message: 'Reward not found.' }); }
    if (!reward.isActive) { return res.status(400).json({ status: 'fail', message: 'This reward is currently unavailable.' }); }
    if (reward.stock !== null && reward.stock <= 0) { return res.status(400).json({ status: 'fail', message: 'This reward is out of stock.' }); }

    const user = await User.findById(userId).select('points');
    if (!user) { return res.status(404).json({ status: 'fail', message: 'User not found.' }); }
    if (user.points < reward.pointsCost) { return res.status(400).json({ status: 'fail', message: 'Not enough points to redeem this reward.' }); }

    // Perform Updates
    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { points: -reward.pointsCost } }, { new: true });
    if (reward.stock !== null) {
        await Reward.findByIdAndUpdate(rewardId, { $inc: { stock: -1 } });
    }
    // TODO: Record Redemption in a separate collection

    res.status(200).json({
        status: 'success',
        message: `Reward "${reward.name}" redeemed successfully!`,
        data: { newPointsBalance: updatedUser?.points }
    });
});


// --- Admin Controllers ---

/**
 * @desc    Create New Reward
 * @route   POST /api/rewards
 * @access  Private/Admin
 */
exports.createReward = handleAsyncError(async (req, res, next) => {
    if (!req.body.name || !req.body.description || req.body.pointsCost === undefined || !req.body.category) {
        return res.status(400).json({ status: 'fail', message: 'Name, description, points cost, and category are required.' });
    }
    // Validate subject ID if provided
    if (req.body.subject && !mongoose.Types.ObjectId.isValid(req.body.subject)) {
         return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID provided.' });
    }
    // Ensure subject is null if an empty string is sent
    if (req.body.subject === '') {
        req.body.subject = null;
    }

    const newReward = await Reward.create(req.body);
    res.status(201).json({ status: 'success', data: { reward: newReward } });
});

/**
 * @desc    Update Reward
 * @route   PATCH /api/rewards/:id
 * @access  Private/Admin
 */
exports.updateReward = handleAsyncError(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid reward ID format.' });
    }
     // Validate subject ID if provided in the update
    if (req.body.subject && !mongoose.Types.ObjectId.isValid(req.body.subject)) {
         return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID provided.' });
    }
     // Allow unsetting the subject by sending null or empty string
    if (req.body.subject === '' || req.body.subject === null) {
        req.body.subject = null; // Ensure it's stored as null if unset
    }


    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!reward) {
        return res.status(404).json({ status: 'fail', message: 'Reward not found.' });
    }
    res.status(200).json({ status: 'success', data: { reward } });
});

/**
 * @desc    Delete Reward
 * @route   DELETE /api/rewards/:id
 * @access  Private/Admin
 */
exports.deleteReward = handleAsyncError(async (req, res, next) => {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid reward ID format.' });
    }
    const reward = await Reward.findByIdAndDelete(req.params.id);
    if (!reward) { return res.status(404).json({ status: 'fail', message: 'Reward not found.' }); }
    res.status(204).json({ status: 'success', data: null });
});

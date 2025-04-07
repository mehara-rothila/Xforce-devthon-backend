// routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController'); // Adjust path if needed
const { protect } = require('../middleware/authMiddleware'); // <-- Import the protect middleware

const router = express.Router();

// --- Authentication Routes ---

// Public Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Private Route - Get Current User Details
// Apply the 'protect' middleware before the controller function
router.get('/me', protect, authController.getMe); // <-- Added protect middleware


module.exports = router;

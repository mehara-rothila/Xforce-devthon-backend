// controllers/authController.js

// --- Dependencies ---
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const User = require('../models/userModel'); // Adjust path if needed
const DailyActivityLog = require('../models/dailyActivityLogModel'); // *** ADD THIS ***
const sendEmail = require('../utils/email'); // Uses the updated email utility
const { startOfDay, subDays, isSameDay } = require('date-fns'); // *** ADD date-fns ***

// --- Email Template (Password Reset) ---
const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head> <title>Password Reset</title> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css"> <style type="text/css"> body { margin: 0; padding: 0; font-family: 'Open Sans', sans-serif; background: #E5E5E5; } table, td { border-collapse: collapse; } .container { width: 100%; max-width: 500px; margin: 70px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); } .main-content { padding: 40px 30px; color: #333333; } .button { width: auto; background: #6D28D9; /* Purple */ text-decoration: none; display: inline-block; padding: 12px 25px; color: #ffffff !important; font-size: 18px; text-align: center; font-weight: bold; border-radius: 7px; letter-spacing: 1px; border: none; cursor: default; } @media only screen and (max-width: 480px) { .container { width: 90% !important; margin: 30px auto; } .main-content { padding: 30px 20px; } .button { padding: 10px 20px; font-size: 16px;} } </style></head>
<body> <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F3F4F6"> <tbody> <tr> <td valign="top" align="center" style="padding: 20px 0;"> <table class="container" width="600" cellspacing="0" cellpadding="0" border="0"> <tbody> <tr> <td class="main-content"> <table width="100%" cellspacing="0" cellpadding="0" border="0"> <tbody> <tr> <td style="padding: 0 0 24px; font-size: 22px; line-height: 150%; font-weight: bold; color: #1F2937; text-align: center;"> Forgot Your Password? </td> </tr> <tr> <td style="padding: 0 0 15px; font-size: 15px; line-height: 160%; color: #4B5563;"> We received a password reset request for your account associated with: <span style="color: #4F46E5; font-weight: 600;">{{email}}</span>. </td> </tr> <tr> <td style="padding: 0 0 20px; font-size: 15px; line-height: 160%; color: #4B5563;"> Use the One-Time Password (OTP) below to reset your password. </td> </tr> <tr> <td style="padding: 10px 0 30px; text-align: center;"> <p class="button">{{otp}}</p> </td> </tr> <tr> <td style="padding: 0 0 15px; font-size: 14px; line-height: 150%; color: #6B7280; text-align: center;"> This OTP is valid for <strong>15 minutes</strong>. </td> </tr> <tr> <td style="padding: 20px 0 0; font-size: 13px; line-height: 150%; color: #6B7280; text-align: center;"> If you didn't request this password reset, you can safely ignore this email. Your password will not be changed. </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table></body></html>
`;


// --- Helper function to sign JWT token ---
const signToken = (id) => {
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
      console.error("FATAL ERROR: JWT_SECRET or JWT_EXPIRES_IN is not defined in .env file.");
    }
    const secret = process.env.JWT_SECRET || 'fallback-insecure-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d'; // Consider a shorter duration for production
    return jwt.sign({ id }, secret, { expiresIn });
};

// --- Controller Functions ---

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, passwordConfirm } = req.body;
        console.log('[Backend] Registration attempt received:', { name, email });

        // 1. Validate Input
        if (!name || !email || !password || !passwordConfirm) {
          return res.status(400).json({ status: 'fail', message: 'Please provide name, email, password, and confirm password.' });
        }
        if (!validator.isEmail(email)) {
          return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
        }
        if (password !== passwordConfirm) {
          return res.status(400).json({ status: 'fail', message: 'Passwords do not match.' });
        }
         if (password.length < 8) {
           return res.status(400).json({ status: 'fail', message: 'Password must be at least 8 characters long.' });
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ status: 'fail', message: 'Email already exists. Please log in or use a different email.' });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 4. Create new user
        const newUser = await User.create({
          name,
          email,
          password: hashedPassword,
          lastActive: new Date() // Set initial lastActive
        });
        newUser.password = undefined;
        console.log('[Backend] User created successfully:', newUser._id);

        // *** ADD: Log first activity for new user ***
        try {
            const todayUTC = startOfDay(new Date()); // Get start of today UTC
            await DailyActivityLog.findOneAndUpdate(
                { user: newUser._id, date: todayUTC },
                { $set: { lastTimestamp: new Date() } }, // Update timestamp if somehow exists
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`[Backend] Logged first activity for new user ${newUser._id} on ${todayUTC.toISOString().split('T')[0]}`);
        } catch (logError) {
            console.error(`[Backend] Error logging first activity for user ${newUser._id}:`, logError);
            // Don't fail registration if logging fails
        }
        // *** END ADD ***

        // 5. Generate JWT Token
        const token = signToken(newUser._id);
        console.log('[Backend] JWT Token generated for new user');

        // 6. Send Response
        res.status(201).json({
          status: 'success',
          token,
          data: { user: newUser },
        });

      } catch (err) {
        console.error("[Backend] Error during registration:", err);
        if (!res.headersSent) {
             if (err.name === 'ValidationError') {
                 const errors = Object.values(err.errors).map(el => el.message);
                 const message = `Invalid input data. ${errors.join('. ')}`;
                 return res.status(400).json({ status: 'fail', message });
             }
             res.status(500).json({ status: 'error', message: 'Registration failed due to a server error.' });
        } else {
            console.error("[Backend] Headers already sent for registration error.");
        }
      }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
     try {
        const { email, password } = req.body;
        console.log('[Backend] Login attempt received:', { email });

        // 1. Validate Input
        if (!email || !password) {
          return res.status(400).json({ status: 'fail', message: 'Please provide email and password.' });
        }

        // 2. Check if user exists & get password + streak info
        // *** MODIFIED: Select streak and lastActive ***
        const user = await User.findOne({ email }).select('+password +streak +lastActive');

        // 3. Check password validity
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' });
        }
        console.log('[Backend] User found and password verified:', user._id);

        // *** ADD: Daily Activity Logging & Streak Calculation ***
        const now = new Date();
        const todayUTCStart = startOfDay(now); // Start of today in UTC
        const yesterdayUTCStart = startOfDay(subDays(now, 1)); // Start of yesterday in UTC

        try {
            // Log today's activity (upsert ensures only one entry per day)
            // Use the normalized date for the query condition
            const activityLog = await DailyActivityLog.findOneAndUpdate(
                { user: user._id, date: todayUTCStart },
                { $set: { lastTimestamp: now } }, // Update timestamp
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`[Backend] Logged/Updated activity for user ${user._id} on ${todayUTCStart.toISOString().split('T')[0]}`);

            // Check if user was active yesterday for streak calculation
            const wasActiveYesterday = await DailyActivityLog.findOne({
                user: user._id,
                date: yesterdayUTCStart
            });

            let newStreak = user.streak || 0;
            // Get the start of the day for the lastActive date stored in the User model
            const lastActiveDateStart = user.lastActive ? startOfDay(user.lastActive) : null;

            // Check if the last recorded activity in the User model was NOT today
            // This prevents incrementing the streak multiple times on the same day
            if (!lastActiveDateStart || !isSameDay(todayUTCStart, lastActiveDateStart)) {
                if (wasActiveYesterday) {
                    // Active yesterday, increment streak
                    newStreak++;
                    console.log(`[Backend] User ${user._id} was active yesterday. Incrementing streak to ${newStreak}`);
                } else {
                    // Not active yesterday, reset streak to 1 (for today's activity)
                    newStreak = 1;
                    console.log(`[Backend] User ${user._id} was NOT active yesterday. Resetting streak to 1.`);
                }
                // Update user's streak and lastActive timestamp in the User model
                user.streak = newStreak;
                user.lastActive = now; // Update lastActive to the current time
                await user.save({ validateBeforeSave: false }); // Save updated streak/lastActive
            } else {
                 console.log(`[Backend] User ${user._id} already marked active today. Streak remains ${user.streak}.`);
                 // Optionally update lastActive anyway if you want to track the *latest* login time
                 // user.lastActive = now;
                 // await user.save({ validateBeforeSave: false });
            }

        } catch (logError) {
            console.error(`[Backend] Error logging activity or calculating streak for user ${user._id}:`, logError);
            // Don't fail login if logging/streak fails
        }
        // *** END ADD ***


        // 4. Generate JWT Token
        const token = signToken(user._id);
        console.log('[Backend] JWT Token generated for logged in user');

        // 5. Send Response
        user.password = undefined; // Remove password from output
        // Ensure the user object sent back has the potentially updated streak
        const userResponseData = user.toObject(); // Convert to plain object if needed
        delete userResponseData.password; // Ensure password is removed again if toObject includes it

        res.status(200).json({
          status: 'success',
          token,
          data: { user: userResponseData }, // Send back user data
        });

      } catch (err) {
        console.error("[Backend] Error during login:", err);
        if (!res.headersSent) {
          res.status(500).json({ status: 'error', message: 'Login failed due to a server error.' });
        } else {
            console.error("[Backend] Headers already sent for login error.");
        }
      }
};

/**
 * @desc    Handle forgot password request (send OTP via Brevo)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
        }
        console.log(`[Backend] Forgot password request for email: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
          console.log(`[Backend] User not found for email ${email}, sending generic success response.`);
          return res.status(200).json({ status: 'success', message: 'If an account with that email exists, an OTP has been sent.' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[Backend] Generated OTP for ${email}: ${otp}`); // Log OTP only in dev/debug
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        user.passwordResetOtp = hashedOtp;
        user.passwordResetExpires = new Date(otpExpires);
        await user.save({ validateBeforeSave: false });
        console.log(`[Backend] Hashed OTP and expiry saved for user ${user._id}`);
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your Password Reset OTP (Valid for 15 min)',
                htmlContent: PASSWORD_RESET_TEMPLATE,
                replacements: { email: user.email, otp: otp }
            });
        } catch (emailError) {
            console.error("[Backend] Email sending failed via Brevo:", emailError);
            user.passwordResetOtp = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            console.log(`[Backend] Cleared OTP fields for ${user.email} after email sending error.`);
            return res.status(500).json({ status: 'error', message: 'Failed to send password reset email. Please try again.' });
        }
        res.status(200).json({ status: 'success', message: 'An OTP has been sent to your email address.' });
      } catch (err) {
        console.error("[Backend] General error in forgotPassword:", err);
         try {
            if (!err.message?.includes('Email could not be sent')) {
                 const userToClean = await User.findOne({ email: req.body.email }).select('+passwordResetOtp');
                 if (userToClean && userToClean.passwordResetOtp) {
                    userToClean.passwordResetOtp = undefined;
                    userToClean.passwordResetExpires = undefined;
                    await userToClean.save({ validateBeforeSave: false });
                    console.log(`[Backend] Cleaned OTP fields for ${req.body.email} after general error.`);
                 }
            }
         } catch (cleanupError) {
             console.error("[Backend] Error cleaning up OTP fields after forgotPassword general error:", cleanupError);
         }
        if (!res.headersSent) {
          res.status(500).json({ status: 'error', message: 'An unexpected error occurred. Please try again.' });
        } else {
            console.error("[Backend] Headers already sent for forgotPassword general error.");
        }
      }
};

/**
 * @desc    Reset password using OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
     try {
        const { email, otp, password, passwordConfirm } = req.body;
        console.log(`[Backend] Reset password attempt for email: ${email}`);
        if (!email || !otp || !password || !passwordConfirm) {
            return res.status(400).json({ status: 'fail', message: 'Please provide email, OTP, new password, and confirmation.' });
        }
         if (!validator.isEmail(email)) {
            return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
        }
        if (password !== passwordConfirm) {
            return res.status(400).json({ status: 'fail', message: 'New passwords do not match.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ status: 'fail', message: 'New password must be at least 8 characters long.' });
        }
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP format. Please enter the 6-digit code.' });
        }
        const user = await User.findOne({ email }).select('+passwordResetOtp +passwordResetExpires');
        if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
            console.log(`[Backend] Reset Failed: User not found or no OTP data for ${email}`);
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP or email address.' });
        }
        if (user.passwordResetExpires < Date.now()) {
            console.log(`[Backend] Reset Failed: OTP expired for ${email}`);
            user.passwordResetOtp = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({ status: 'fail', message: 'OTP has expired. Please request a new one.' });
        }
        const isOtpValid = await bcrypt.compare(otp, user.passwordResetOtp);
        if (!isOtpValid) {
            console.log(`[Backend] Reset Failed: Invalid OTP for ${email}`);
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP or email address.' });
        }
        const hashedNewPassword = await bcrypt.hash(password, 12);
        user.password = hashedNewPassword;
        user.passwordResetOtp = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        console.log(`[Backend] Password successfully reset for user ${user._id}`);
        const token = signToken(user._id);
        console.log('[Backend] JWT Token generated after password reset');
        user.password = undefined;
        res.status(200).json({
            status: 'success', token, message: 'Password has been reset successfully!',
            data: { user }
        });
    } catch (err) {
        console.error("[Backend] Error during password reset:", err);
        if (!res.headersSent) {
             if (err.name === 'ValidationError') {
                 const errors = Object.values(err.errors).map(el => el.message);
                 const message = `Invalid input data. ${errors.join('. ')}`;
                 return res.status(400).json({ status: 'fail', message });
             }
            res.status(500).json({ status: 'error', message: 'An error occurred while resetting the password.' });
        } else {
            console.error("[Backend] Headers already sent for resetPassword error.");
        }
    }
};


/**
 * @desc    Get current logged-in user's details
 * @route   GET /api/auth/me
 * @access  Private (Requires protect middleware)
 */
exports.getMe = async (req, res, next) => {
    // console.log(`[Backend] /api/auth/me endpoint hit`);
    if (!req.user || !req.user.id) {
        console.error('[Backend] getMe Error: req.user not found. Is protect middleware running before this route?');
        return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in again.' });
    }
    try {
        const currentUser = await User.findById(req.user.id).select('-passwordResetOtp -passwordResetExpires');
        if (!currentUser) {
            console.log(`[Backend] getMe: User with ID ${req.user.id} not found.`);
            return res.status(404).json({ status: 'fail', message: 'User not found.' });
        }
        res.status(200).json({
            status: 'success',
            data: { user: currentUser }
        });
    } catch(err) {
        console.error("[Backend] Error fetching user in getMe:", err);
        if (!res.headersSent) {
             res.status(500).json({ status: 'error', message: 'Could not fetch user data.' });
        }
    }
};
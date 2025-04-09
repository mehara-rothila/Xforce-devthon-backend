// Auth controller 
// controllers/authController.js

// --- Dependencies ---
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const User = require('../models/userModel'); // Adjust path if needed
const sendEmail = require('../utils/email'); // Uses the updated email utility

// --- Email Template (Password Reset) ---
const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head> <title>Password Reset</title> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css"> <style type="text/css"> body { margin: 0; padding: 0; font-family: 'Open Sans', sans-serif; background: #E5E5E5; } table, td { border-collapse: collapse; } .container { width: 100%; max-width: 500px; margin: 70px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); } .main-content { padding: 40px 30px; color: #333333; } .button { width: auto; background: #6D28D9; /* Purple */ text-decoration: none; display: inline-block; padding: 12px 25px; color: #ffffff !important; font-size: 18px; text-align: center; font-weight: bold; border-radius: 7px; letter-spacing: 1px; border: none; cursor: default; } @media only screen and (max-width: 480px) { .container { width: 90% !important; margin: 30px auto; } .main-content { padding: 30px 20px; } .button { padding: 10px 20px; font-size: 16px;} } </style></head>
<body> <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F3F4F6"> <tbody> <tr> <td valign="top" align="center" style="padding: 20px 0;"> <table class="container" width="600" cellspacing="0" cellpadding="0" border="0"> <tbody> <tr> <td class="main-content"> <table width="100%" cellspacing="0" cellpadding="0" border="0"> <tbody> <tr> <td style="padding: 0 0 24px; font-size: 22px; line-height: 150%; font-weight: bold; color: #1F2937; text-align: center;"> Forgot Your Password? </td> </tr> <tr> <td style="padding: 0 0 15px; font-size: 15px; line-height: 160%; color: #4B5563;"> We received a password reset request for your account associated with: <span style="color: #4F46E5; font-weight: 600;">{{email}}</span>. </td> </tr> <tr> <td style="padding: 0 0 20px; font-size: 15px; line-height: 160%; color: #4B5563;"> Use the One-Time Password (OTP) below to reset your password. </td> </tr> <tr> <td style="padding: 10px 0 30px; text-align: center;"> <p class="button">{{otp}}</p> </td> </tr> <tr> <td style="padding: 0 0 15px; font-size: 14px; line-height: 150%; color: #6B7280; text-align: center;"> This OTP is valid for <strong>15 minutes</strong>. </td> </tr> <tr> <td style="padding: 20px 0 0; font-size: 13px; line-height: 150%; color: #6B7280; text-align: center;"> If you didn't request this password reset, you can safely ignore this email. Your password will not be changed. </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table></body></html>
`;


// --- Helper function to sign JWT token ---
const signToken = (id) => {
    // ... (keep existing signToken function) ...
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
      console.error("FATAL ERROR: JWT_SECRET or JWT_EXPIRES_IN is not defined in .env file.");
  }
  const secret = process.env.JWT_SECRET || 'fallback-insecure-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  return jwt.sign({ id }, secret, { expiresIn });
};

// --- Controller Functions ---

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
    // ... (keep existing register function) ...
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

    // 3. Hash password (Assuming NO password hashing middleware in User model)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });
    newUser.password = undefined; // Ensure password isn't returned
    console.log('[Backend] User created successfully:', newUser._id);

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
    // ... (keep existing login function) ...
     try {
    const { email, password } = req.body;
    console.log('[Backend] Login attempt received:', { email });

    // 1. Validate Input
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and password.' });
    }

    // 2. Check if user exists & get password (select explicitly)
    const user = await User.findOne({ email }).select('+password');

    // 3. Check password validity
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' }); // 401 Unauthorized
    }
    console.log('[Backend] User found and password verified:', user._id);

    // 4. Generate JWT Token
    const token = signToken(user._id);
    console.log('[Backend] JWT Token generated for logged in user');

    // 5. Send Response
    user.password = undefined; // Remove password from output
    res.status(200).json({
      status: 'success',
      token,
      data: { user },
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
    // ... (keep existing forgotPassword function) ...
    try {
    // 1. Get user based on POSTed email
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
    }
    console.log(`[Backend] Forgot password request for email: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      // Prevent user enumeration
      console.log(`[Backend] User not found for email ${email}, sending generic success response.`);
      return res.status(200).json({ status: 'success', message: 'If an account with that email exists, an OTP has been sent.' });
    }

    // 2. Generate random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    console.log(`[Backend] Generated OTP for ${email}: ${otp}`); // Log OTP only in dev/debug

    // 3. Hash OTP and set expiry (15 minutes, matching template)
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = Date.now() + 15 * 60 * 1000; // <-- Changed to 15 minutes

    // 4. Save hashed OTP and expiry to user document
    user.passwordResetOtp = hashedOtp;
    user.passwordResetExpires = new Date(otpExpires);
    await user.save({ validateBeforeSave: false });
    console.log(`[Backend] Hashed OTP and expiry saved for user ${user._id}`);

    // 5. Send the PLAIN OTP via email using the HTML template
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your Password Reset OTP (Valid for 15 min)',
            // text: `Your password reset OTP is: ${otp}`, // Optional fallback text
            htmlContent: PASSWORD_RESET_TEMPLATE, // Pass the HTML template
            replacements: { // Pass data to replace placeholders
                email: user.email,
                otp: otp // Send the plain OTP to be displayed in the email
            }
        });
    } catch (emailError) {
        console.error("[Backend] Email sending failed via Brevo:", emailError);
        // Clear OTP fields if email fails, so user can try again
        user.passwordResetOtp = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.log(`[Backend] Cleared OTP fields for ${user.email} after email sending error.`);
        return res.status(500).json({ status: 'error', message: 'Failed to send password reset email. Please try again.' });
    }

    // 6. Send success response to frontend
    res.status(200).json({ status: 'success', message: 'An OTP has been sent to your email address.' });

  } catch (err) {
    console.error("[Backend] General error in forgotPassword:", err);
    // Attempt cleanup if possible
     try {
        // Find user again only if needed and error wasn't email sending
        if (!err.message?.includes('Email could not be sent')) {
             const userToClean = await User.findOne({ email: req.body.email }).select('+passwordResetOtp'); // Select fields to check if they exist
             if (userToClean && userToClean.passwordResetOtp) { // Only clean if OTP was potentially set
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
    // ... (keep existing resetPassword function) ...
     try {
        const { email, otp, password, passwordConfirm } = req.body;
        console.log(`[Backend] Reset password attempt for email: ${email}`);

        // 1. Validate Input
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
         // Basic OTP format check - adjust if your OTP format differs
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP format. Please enter the 6-digit code.' });
        }

        // 2. Find user by email and select OTP fields
        const user = await User.findOne({ email }).select('+passwordResetOtp +passwordResetExpires');

        // 3. Check if user exists, OTP exists, and OTP has not expired
        if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
            console.log(`[Backend] Reset Failed: User not found or no OTP data for ${email}`);
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP or email address.' }); // Generic message
        }

        if (user.passwordResetExpires < Date.now()) {
            console.log(`[Backend] Reset Failed: OTP expired for ${email}`);
             // Clear expired OTP fields here too
            user.passwordResetOtp = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({ status: 'fail', message: 'OTP has expired. Please request a new one.' });
        }

        // 4. Verify the submitted OTP against the stored hash
        const isOtpValid = await bcrypt.compare(otp, user.passwordResetOtp);

        if (!isOtpValid) {
            console.log(`[Backend] Reset Failed: Invalid OTP for ${email}`);
            return res.status(400).json({ status: 'fail', message: 'Invalid OTP or email address.' }); // Generic message
        }

        // 5. If OTP is valid: Hash the new password
        const hashedNewPassword = await bcrypt.hash(password, 12);

        // 6. Update user's password
        user.password = hashedNewPassword;

        // 7. Clear the OTP fields (IMPORTANT!)
        user.passwordResetOtp = undefined;
        user.passwordResetExpires = undefined;

        // 8. Save the updated user document
        await user.save(); // Let Mongoose run full validation this time
        console.log(`[Backend] Password successfully reset for user ${user._id}`);

        // 9. Generate a new JWT token to log the user in automatically
        const token = signToken(user._id);
        console.log('[Backend] JWT Token generated after password reset');

        // 10. Send success response with the new token
        user.password = undefined; // Ensure password isn't sent back
        res.status(200).json({
            status: 'success',
            token, // Send token to log user in
            message: 'Password has been reset successfully!', // Include success message
            data: {
                user // Send back updated user data (optional)
            }
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
    // This function relies on the 'protect' middleware running first
    // and attaching user information (like ID) to req.user
    console.log(`[Backend] /api/auth/me endpoint hit`);

    // The 'protect' middleware should have already added req.user.id
    if (!req.user || !req.user.id) {
        console.error('[Backend] getMe Error: req.user not found. Is protect middleware running before this route?');
        // This case should ideally be caught by the protect middleware itself,
        // but added here as a safeguard.
        return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in again.' });
    }

    try {
        // Fetch the user from the database using the ID from the token/middleware
        // Exclude sensitive fields like password, OTP fields etc.
        const currentUser = await User.findById(req.user.id).select('-passwordResetOtp -passwordResetExpires');

        if (!currentUser) {
            // This might happen if the user was deleted after the token was issued
            console.log(`[Backend] getMe: User with ID ${req.user.id} not found.`);
            return res.status(404).json({ status: 'fail', message: 'User not found.' });
        }

        // Send back the user data (password is not selected by default due to schema)
        res.status(200).json({
            status: 'success',
            data: {
                user: currentUser // Send relevant user details
            }
        });
    } catch(err) {
        console.error("[Backend] Error fetching user in getMe:", err);
        if (!res.headersSent) {
             res.status(500).json({ status: 'error', message: 'Could not fetch user data.' });
        }
    }
};

// Ensure no other 'module.exports = ...' assignments overwrite these.

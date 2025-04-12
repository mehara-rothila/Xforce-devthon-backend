// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Adjust path if needed

exports.protect = async (req, res, next) => {
  let token;

  // 1. Get token and check if it exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // --- DEBUG LOG ---
  console.log('[Auth Middleware] Token received:', token ? 'Yes (Bearer)' : 'No');
  // console.log('[Auth Middleware] Full Token:', token); // Optional: Log full token if needed, but be careful with sensitive data

  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Not authorized, no token provided.' });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // --- DEBUG LOG ---
    console.log('[Auth Middleware] Token decoded successfully. Decoded Payload:', decoded);

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+role'); // Select role if needed for restrictTo
    if (!currentUser) {
      console.error(`[Auth Middleware] User belonging to token (ID: ${decoded.id}) no longer exists.`);
      return res.status(401).json({ status: 'fail', message: 'The user belonging to this token no longer exists.' });
    }

    // --- DEBUG LOG ---
    console.log(`[Auth Middleware] User found in DB. ID: ${currentUser._id}, Role: ${currentUser.role}`);

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser; // Attach user to the request object
    console.log('[Auth Middleware] Access granted for user ID:', req.user.id, ', Role:', req.user.role);
    next(); // Move to the next middleware/controller

  } catch (err) {
    console.error('[Auth Middleware] Token verification failed:', err.name, err.message);
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ status: 'fail', message: 'Invalid token. Please log in again.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ status: 'fail', message: 'Your token has expired. Please log in again.' });
    }
    // Generic error
    return res.status(401).json({ status: 'fail', message: 'Not authorized.' });
  }
};

// Replace the existing restrictTo function with this one
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'moderator']. role='user'
    if (!req.user || !req.user.role) {
         console.error('[Restrict Middleware] req.user or req.user.role not found. Is protect running first?');
         return res.status(500).json({ status: 'error', message: 'User role not identified.' });
    }
    
    // Special handling for preview role
    if (req.user.role === 'preview') {
      // Check if this is a GET request (view-only)
      if (req.method === 'GET') {
        console.log(`[Restrict Middleware] Preview access granted for GET request`);
        // Add a flag to indicate preview mode
        req.isPreviewMode = true;
        return next();
      } else {
        console.log(`[Restrict Middleware] Preview access denied for non-GET request`);
        return res.status(403).json({
          status: 'fail',
          message: 'Preview users can only view content, not modify it'
        });
      }
    }
    
    // Standard role check for non-preview users
    if (!roles.includes(req.user.role)) {
      console.log(`[Restrict Middleware] Permission denied for role: ${req.user.role}. Required: ${roles.join(', ')}`);
      return res.status(403).json({ // 403 Forbidden
          status: 'fail',
          message: 'You do not have permission to perform this action'
      });
    }
    
    console.log(`[Restrict Middleware] Permission granted for role: ${req.user.role}`);
    next();
  };
};
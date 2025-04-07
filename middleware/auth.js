// Auth middleware for DEVELOPMENT only
const User = require('../models/userModel'); // Keep this if needed within the functions eventually

// --- Define the functions normally ---

// Authentication middleware (development version)
const protect = async (req, res, next) => {
  try {
    console.log('Protect middleware (DEV) executing...'); // Added log
    // For development only - create a mock user
    req.user = {
      _id: '64f070a6018c0c66ee419799', // Make sure this ID format matches Mongoose ObjectId if needed elsewhere
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin' // Ensure this role matches what restrictTo expects
    };

    // --- Real Auth Code (Commented Out) ---
    /*
    // 1. Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route (No Token)'
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists'
      });
    }

    // 4. Grant access
    req.user = user;
    */
   // --- End Real Auth Code ---

    console.log('Protect middleware (DEV) successful, mock user attached.'); // Added log
    next();
  } catch (error) {
    console.error("Error in protect middleware (DEV):", error); // Log the actual error
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (Error in protect)'
    });
  }
};

// Role-based authorization
const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(`RestrictTo middleware executing for roles: [${roles.join(', ')}]`); // Added log
    // Ensure protect middleware ran first and attached req.user
    if (!req.user || !req.user.role) {
        console.error('RestrictTo failed: req.user or req.user.role is missing. Did protect middleware run correctly?');
        return res.status(403).json({
          success: false,
          message: 'User role not found, cannot perform authorization check.'
        });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`RestrictTo failed: User role '${req.user.role}' is not in allowed roles [${roles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' does not have permission to perform this action`
      });
    }
    console.log('RestrictTo middleware successful.'); // Added log
    next();
  };
};


// --- Assign the functions to module.exports at the END ---
module.exports = {
  protect,
  restrictTo
};
// Auth middleware for DEVELOPMENT only
const User = require('../models/userModel');

// Authentication middleware (development version)
exports.protect = async (req, res, next) => {
  try {
    // For development only - create a mock user
    // This skips JWT verification for testing purposes
    req.user = {
      id: '64f070a6018c0c66ee419799', // This should be a valid ObjectId
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin'
    };
    
    // Uncomment the code below when you're ready to implement real auth
    /*
    // 1. Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
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
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Role-based authorization
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
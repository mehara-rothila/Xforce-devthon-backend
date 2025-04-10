const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer'); // Import multer for error handling

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const forumRoutes = require('./routes/forumRoutes');
const quizRoutes = require('./routes/quizRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); 
const achievementRoutes = require('./routes/achievementRoutes'); // Import achievement routes

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Apply middleware
app.use(helmet()); // Security headers
// Consider helmet contentSecurityPolicy configuration if needed later
// Example: app.use(helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'trusted-cdn.com'] } }));
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS - configure origins for production
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Serve Static Files ---
// Make files in the 'public' directory accessible directly via URL
// Files in 'public/resources' will be available at '/resources/filename.pdf'
app.use(express.static(path.join(__dirname, 'public'))); // <-- Add static serving

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/achievements', achievementRoutes); // Mount achievement routes

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Xforce-devthon API');
});

// --- Multer Error Handling Middleware ---
// This catches errors specifically from Multer (like file size limits, wrong file type)
// It MUST come AFTER the routes that use multer (like uploadRoutes)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    console.error('Multer Error:', err);
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      // Use the limit defined in uploadRoutes.js (e.g., 20MB)
      message = `File is too large. Maximum size is 20MB.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
       message = 'Unexpected file field.';
    }
    return res.status(400).json({ status: 'fail', message });
  } else if (err) {
    // Handle custom errors (like wrong file type from fileFilter)
     if (err.message === 'Not a PDF file!') {
         return res.status(400).json({ status: 'fail', message: err.message });
     }
    // Handle other non-multer errors that might occur during upload processing
    console.error('Unknown Upload Related Error:', err);
    // Pass to the general error handler if it's not an upload-specific error we handle here
    // Or send a generic response:
    // return res.status(500).json({ status: 'error', message: 'Internal server error during file processing.' });
    next(err); // Pass to general error handler for other errors
  } else {
     // Everything went fine.
     next();
  }
});


// General error handling middleware (Keep this last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes

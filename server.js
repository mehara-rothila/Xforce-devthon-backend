const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = 'morgan';
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer'); // Import multer for error handling

// Load environment variables
// Make sure this runs BEFORE accessing process.env variables used below it
dotenv.config();

// --- Check if MONGODB_URI is loaded ---
// Add this console log immediately after dotenv.config()
// console.log(`[Server Startup] MONGODB_URI loaded: ${process.env.MONGODB_URI ? 'Yes, length ' + process.env.MONGODB_URI.length : 'NO - UNDEFINED'}`);
// If this logs "NO - UNDEFINED", your .env file isn't being read OR the variable isn't set in the environment (like Fly.io secrets)

// Import routes (Ensure these paths and file casings are correct!)
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const forumRoutes = require('./routes/forumRoutes');
const quizRoutes = require('./routes/quizRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Import middleware (Ensure path and casing are correct!)
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// --- Connect to MongoDB ---
// Check if the URI environment variable exists before trying to connect
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  // Optionally exit the process if the DB connection is critical for startup
  // process.exit(1);
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err)); // This will catch connection errors
}

// --- Apply Core Middleware ---

// Security headers (modify as needed)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allows resources like images to be loaded cross-origin
}));

// Request logging
app.use(morgan('dev'));

// --- CORS Configuration ---
const allowedOrigins = [
  'https://xforce1.netlify.app', // Your primary frontend
  // Add other allowed origins if needed (e.g., localhost for testing)
  'http://localhost:3000',
  'https://xforce-devthon.netlify.app' // Keep if still used
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin OR if origin is in the allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed.`);
      callback(new Error('Not allowed by CORS')); // Block requests not in the list
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] // Allowed headers
}));

// Handle CORS preflight requests (OPTIONS method)
app.options('*', cors()); // Apply CORS options to all routes for preflight

// --- Body Parsers ---
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- Static File Serving ---
// Serve files from the 'public' directory (e.g., uploaded images/files if stored there)
// Example: A file at public/uploads/image.jpg would be accessible at yourdomain.com/uploads/image.jpg
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
// Mount all API endpoints under the /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/uploads', uploadRoutes); // Multer routes are included here

// --- Root Route ---
app.get('/', (req, res) => {
  // Basic check if DB connection seems okay (optional)
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'Connected' : `State: ${dbState}`;
  res.send(`Welcome to Xforce-devthon API. DB Status: ${dbStatus}`);
});

// --- Multer Error Handling ---
// Place this *after* routes that use Multer (like /api/uploads)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') message = `File is too large.`;
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field.';
    return res.status(400).json({ status: 'fail', message });
  } else if (err && (err.message === 'Not a PDF file!' || err.message === 'Invalid file type')) {
    // Handle custom file type errors from Multer's fileFilter
     console.error('Custom Upload Error:', err.message);
    return res.status(400).json({ status: 'fail', message: err.message });
  }
  // If not a Multer error or handled custom error, pass it to the general handler
  next(err);
});

// --- General Error Handling Middleware ---
// This should be the LAST middleware added
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 3000; // Use 3000 to match fly.toml, fallback if needed
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for potential testing frameworks
module.exports = app;
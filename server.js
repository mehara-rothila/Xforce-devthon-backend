console.log("--- SERVER STARTING - VERSION WITH MORGAN FIX ---"); // <-- Unique marker for this version

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan'); // <-- Ensure this is require('morgan')
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');

// Load environment variables
dotenv.config();

// --- Check if MONGODB_URI is loaded ---
// console.log(`[Server Startup] MONGODB_URI loaded: ${process.env.MONGODB_URI ? 'Yes, length ' + process.env.MONGODB_URI.length : 'NO - UNDEFINED'}`);

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
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  // process.exit(1); // Optionally exit if DB is critical
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// --- Apply Core Middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('dev')); // <-- Uses the correctly required morgan variable

// --- CORS Configuration ---
const allowedOrigins = [
  'https://xforce1.netlify.app',
  'http://localhost:3000',
  'https://xforce-devthon.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());

// --- Body Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static File Serving ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/uploads', uploadRoutes);

// --- Root Route ---
app.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'Connected' : `State: ${dbState}`;
  res.send(`Welcome to Xforce-devthon API. DB Status: ${dbStatus}`);
});

// --- Multer Error Handling ---
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') message = `File is too large.`;
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field.';
    return res.status(400).json({ status: 'fail', message });
  } else if (err && (err.message === 'Not a PDF file!' || err.message === 'Invalid file type')) {
     console.error('Custom Upload Error:', err.message);
    return res.status(400).json({ status: 'fail', message: err.message });
  }
  next(err);
});

// --- General Error Handling Middleware ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
console.log("--- SERVER STARTING - ISOLATION TEST 1 ---"); // <-- Test marker

const express = require('express');
console.log("Loaded express");
const mongoose = require('mongoose');
console.log("Loaded mongoose");
const cors = require('cors');
console.log("Loaded cors");
const helmet = require('helmet');
console.log("Loaded helmet");
const morgan = require('morgan');
console.log("Loaded morgan");
const dotenv = require('dotenv');
console.log("Loaded dotenv");
dotenv.config();
console.log("Executed dotenv.config()");
const path = require('path');
console.log("Loaded path");
const multer = require('multer');
console.log("Loaded multer");

// --- Import routes (COMMENTED OUT FOR ISOLATION TEST 1) ---
console.log("Skipping route loading for isolation test...");
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const subjectRoutes = require('./routes/subjectRoutes');
// const forumRoutes = require('./routes/forumRoutes');
// const quizRoutes = require('./routes/quizRoutes');
// const resourceRoutes = require('./routes/resourceRoutes');
// const rewardRoutes = require('./routes/rewardRoutes');
// const uploadRoutes = require('./routes/uploadRoutes');
console.log("Finished skipping route loading.");

// --- Import middleware (COMMENTED OUT FOR ISOLATION TEST 1) ---
console.log("Skipping middleware loading for isolation test...");
// const errorHandler = require('./middleware/errorHandler');
console.log("Finished skipping middleware loading.");

// --- Initialize Express app ---
const app = express();
console.log("Express app initialized.");

// --- Connect to MongoDB ---
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI environment variable is not set.');
  // process.exit(1); // Optionally exit if DB is critical
} else {
  console.log("Attempting to connect to MongoDB...");
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// --- Apply Core Middleware ---
console.log("Applying helmet middleware...");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
console.log("Applying morgan middleware...");
app.use(morgan('dev'));
console.log("Applying CORS middleware...");
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
console.log("Applied CORS middleware.");

// --- Body Parsers ---
console.log("Applying body parsers...");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("Applied body parsers.");

// --- Static File Serving ---
console.log("Applying static file middleware...");
app.use(express.static(path.join(__dirname, 'public')));
console.log("Applied static file middleware.");

// --- API Routes (COMMENTED OUT FOR ISOLATION TEST 1) ---
console.log("Skipping API route application...");
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/subjects', subjectRoutes);
// app.use('/api/forum', forumRoutes);
// app.use('/api/quizzes', quizRoutes);
// app.use('/api/resources', resourceRoutes);
// app.use('/api/rewards', rewardRoutes);
// app.use('/api/uploads', uploadRoutes);
console.log("Finished skipping API route application.");

// --- Root Route (Still active for testing) ---
app.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'Connected' : `State: ${dbState}`;
  console.log(`Serving root route. DB Status: ${dbStatus}`);
  res.send(`Welcome to Xforce-devthon API (Isolation Test). DB Status: ${dbStatus}`);
});

// --- Multer Error Handling ---
console.log("Applying Multer error handler...");
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
console.log("Applied Multer error handler.");

// --- General Error Handling Middleware (COMMENTED OUT FOR ISOLATION TEST 1) ---
console.log("Skipping general error handler application...");
// app.use(errorHandler);
console.log("Finished skipping general error handler application.");

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("--- SERVER SUCCESSFULLY STARTED (ISOLATION TEST 1) ---"); // <-- Test marker
});

module.exports = app;
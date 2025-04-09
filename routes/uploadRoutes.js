// routes/uploadRoutes.js (or similar)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // File system module to create directory if needed
const { protect, restrictTo } = require('../middleware/auth'); // Assuming you want to protect uploads

const router = express.Router();

// --- Multer Configuration ---

// Ensure the target directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'resources'); // Adjust path as needed
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

// 1. Disk Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to the 'public/resources' directory
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    // Example: fieldname-timestamp.extension (e.g., resourceFile-1678886400000.pdf)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. File Filter (Optional: Only allow PDFs)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Not a PDF file!'), false); // Reject file
  }
};

// 3. Multer Upload Instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 20 // Limit file size (e.g., 20MB)
  }
});

// --- Upload Route Controller ---

const uploadResourceFile = (req, res) => {
  // Multer adds the 'file' object to the request if upload is successful
  if (!req.file) {
    // This might happen if fileFilter rejects the file
    return res.status(400).json({
      status: 'fail',
      message: 'File upload failed. Please upload a valid PDF file within the size limit.'
    });
  }

  // Construct the path that will be stored in the database and used for access
  // This should be relative to the 'public' folder or an absolute URL
  // Assuming 'public' is served statically at the root '/'
  const filePath = `/resources/${req.file.filename}`; // IMPORTANT: Adjust if your static serving is different

  // Send back the path to the uploaded file
  res.status(200).json({
    status: 'success',
    message: 'File uploaded successfully!',
    data: {
      filePath: filePath // This path will be saved in the Resource document
    }
  });
};

// --- Upload Route Definition ---

// POST /api/uploads/resource - Handles single file upload named 'resourceFile'
// Protected: Only logged-in admins can upload (adjust middleware as needed)
router.post(
    '/resource',
    protect,
    restrictTo('admin'),
    upload.single('resourceFile'), // 'resourceFile' must match the name attribute in your frontend form input <input type="file" name="resourceFile">
    uploadResourceFile
);

// --- Multer Error Handling Middleware (Add this AFTER your routes in app.js/server.js) ---
// This catches errors specifically from Multer (like file size limits)
// Place this in your main app setup file (app.js or server.js) AFTER defining routes that use multer
/*
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    console.error('Multer Error:', err);
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Maximum size is 20MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
       message = 'Unexpected file field.';
    }
    return res.status(400).json({ status: 'fail', message });
  } else if (err) {
    // An unknown error occurred when uploading.
     if (err.message === 'Not a PDF file!') {
         return res.status(400).json({ status: 'fail', message: err.message });
     }
    console.error('Unknown Upload Error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error during upload.' });
  }

  // Everything went fine.
  next();
});
*/


module.exports = router;

// --- How to use it in your main app file (e.g., app.js or server.js) ---
/*
const express = require('express');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes'); // Import the upload router
// ... other imports and middleware ...

const app = express();

// --- Serve Static Files ---
// Make files in the 'public' directory accessible directly via URL
app.use(express.static(path.join(__dirname, 'public')));

// ... other middleware like json parser, cors, etc. ...
// app.use(express.json());
// app.use(cors());

// --- Mount Routers ---
// app.use('/api/resources', resourceRoutes);
// app.use('/api/quizzes', quizRoutes);
app.use('/api/uploads', uploadRoutes); // Mount the upload router

// --- Mount Multer Error Handler (AFTER other routes) ---
// Add the Multer error handling middleware here (copy from above)


// ... Start server ...
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

*/

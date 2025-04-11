const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer'); // Import multer for error handling
const fs = require('fs');

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

// --- Migration System ---
// Initialize the migration registry schema
const initMigrationSystem = async () => {
  // Create a schema for tracking migrations
  const migrationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    executedAt: { type: Date, default: Date.now },
    description: String
  });

  // Create or retrieve the model if it already exists
  const MigrationRegistry = mongoose.models.MigrationRegistry || 
    mongoose.model('MigrationRegistry', migrationSchema);
  
  return MigrationRegistry;
};

// Function to check and run pending migrations
const runPendingMigrations = async () => {
  console.log('Checking for pending migrations...');
  
  try {
    // Initialize migration registry
    const MigrationRegistry = await initMigrationSystem();
    
    // List of migrations to run
    const migrations = [
      {
        id: '001-add-quiz-points-earned',
        description: 'Add quizPointsEarned field to all users',
        async execute() {
          console.log('Running migration: Adding quizPointsEarned field to users');
          
          // Get the User model
          const User = mongoose.models.User || mongoose.model('User');
          
          // Update all users without quizPointsEarned
          const result = await User.updateMany(
            { quizPointsEarned: { $exists: false } },
            { $set: { quizPointsEarned: 0 } }
          );
          
          console.log(`Migration complete: ${result.modifiedCount} users updated with quizPointsEarned=0`);
          
          // Record the migration execution
          await MigrationRegistry.findOneAndUpdate(
            { id: this.id },
            { 
              id: this.id, 
              description: this.description,
              executedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          return result;
        }
      },
      // New quiz points achievements migrations
      {
        id: '002-quiz-points-bronze',
        description: 'Add Bronze Point Scorer achievement',
        async execute() {
          console.log('Running migration: Adding Bronze Point Scorer achievement');
          
          // Get the Achievement model
          const Achievement = mongoose.models.Achievement || mongoose.model('Achievement');
          
          // Create the achievement if it doesn't exist
          const existingAchievement = await Achievement.findOne({ title: 'Bronze Point Scorer' });
          if (!existingAchievement) {
            await Achievement.create({
              title: 'Bronze Point Scorer',
              description: 'Earn 100 quiz points',
              icon: 'bronze_medal',
              category: 'academic',
              xp: 50,
              points: 25,
              rarity: 'common',
              trigger: 'quiz_points',
              requirement: 100
            });
            console.log('Created Bronze Point Scorer achievement');
          } else {
            console.log('Bronze Point Scorer achievement already exists');
          }
          
          // Record the migration execution
          await MigrationRegistry.findOneAndUpdate(
            { id: this.id },
            { 
              id: this.id, 
              description: this.description,
              executedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          return { success: true };
        }
      },
      {
        id: '003-quiz-points-silver',
        description: 'Add Silver Point Scorer achievement',
        async execute() {
          console.log('Running migration: Adding Silver Point Scorer achievement');
          
          // Get the Achievement model
          const Achievement = mongoose.models.Achievement || mongoose.model('Achievement');
          
          // Create the achievement if it doesn't exist
          const existingAchievement = await Achievement.findOne({ title: 'Silver Point Scorer' });
          if (!existingAchievement) {
            await Achievement.create({
              title: 'Silver Point Scorer',
              description: 'Earn 500 quiz points',
              icon: 'silver_medal',
              category: 'academic',
              xp: 150,
              points: 75,
              rarity: 'uncommon',
              trigger: 'quiz_points',
              requirement: 500
            });
            console.log('Created Silver Point Scorer achievement');
          } else {
            console.log('Silver Point Scorer achievement already exists');
          }
          
          // Record the migration execution
          await MigrationRegistry.findOneAndUpdate(
            { id: this.id },
            { 
              id: this.id, 
              description: this.description,
              executedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          return { success: true };
        }
      },
      {
        id: '004-quiz-points-gold',
        description: 'Add Gold Point Scorer achievement',
        async execute() {
          console.log('Running migration: Adding Gold Point Scorer achievement');
          
          // Get the Achievement model
          const Achievement = mongoose.models.Achievement || mongoose.model('Achievement');
          
          // Create the achievement if it doesn't exist
          const existingAchievement = await Achievement.findOne({ title: 'Gold Point Scorer' });
          if (!existingAchievement) {
            await Achievement.create({
              title: 'Gold Point Scorer',
              description: 'Earn a total of 1,000 quiz points',
              icon: 'gold_medal',
              category: 'academic',
              xp: 300,
              points: 150,
              rarity: 'rare',
              trigger: 'quiz_points',
              requirement: 1000
            });
            console.log('Created Gold Point Scorer achievement');
          } else {
            console.log('Gold Point Scorer achievement already exists');
          }
          
          // Record the migration execution
          await MigrationRegistry.findOneAndUpdate(
            { id: this.id },
            { 
              id: this.id, 
              description: this.description,
              executedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          return { success: true };
        }
      },
      {
        id: '005-quiz-points-champion',
        description: 'Add Quiz Champion achievement',
        async execute() {
          console.log('Running migration: Adding Quiz Champion achievement');
          
          // Get the Achievement model
          const Achievement = mongoose.models.Achievement || mongoose.model('Achievement');
          
          // Create the achievement if it doesn't exist
          const existingAchievement = await Achievement.findOne({ title: 'Quiz Champion' });
          if (!existingAchievement) {
            await Achievement.create({
              title: 'Quiz Champion',
              description: 'Earn a total of 5,000 quiz points',
              icon: 'trophy',
              category: 'academic',
              xp: 1000,
              points: 500,
              rarity: 'legendary',
              trigger: 'quiz_points',
              requirement: 5000
            });
            console.log('Created Quiz Champion achievement');
          } else {
            console.log('Quiz Champion achievement already exists');
          }
          
          // Record the migration execution
          await MigrationRegistry.findOneAndUpdate(
            { id: this.id },
            { 
              id: this.id, 
              description: this.description,
              executedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          return { success: true };
        }
      }
      // Add more migrations here as needed
    ];
    
    // Check and run each migration if not already executed
    for (const migration of migrations) {
      const isExecuted = await MigrationRegistry.findOne({ id: migration.id });
      
      if (isExecuted) {
        console.log(`Migration ${migration.id} already executed on ${isExecuted.executedAt}, skipping.`);
      } else {
        console.log(`Executing migration: ${migration.id} - ${migration.description}`);
        await migration.execute();
        console.log(`Migration ${migration.id} completed successfully.`);
      }
    }
    
    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration error:', error);
    // We don't want to crash the server if migrations fail
    // Just log the error and continue starting the server
  }
};

// Connect to MongoDB and run migrations before starting the server
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    // Run migrations after connection is established
    await runPendingMigrations();
    // Continue with server setup
    startServer();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit on connection failure
  });

// Function to start the server after migrations
const startServer = () => {
  // Apply middleware
  app.use(helmet()); // Security headers
  app.use(morgan('dev')); // Logging
  app.use(cors()); // Enable CORS - configure origins for production
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

  // --- Serve Static Files ---
  app.use(express.static(path.join(__dirname, 'public')));

  // Define API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/rewards', rewardRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/achievements', achievementRoutes);

  // Root route
  app.get('/', (req, res) => {
    res.send('Welcome to Xforce-devthon API');
  });

  // --- Multer Error Handling Middleware ---
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err);
      let message = 'File upload error.';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = `File is too large. Maximum size is 20MB.`;
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Unexpected file field.';
      }
      return res.status(400).json({ status: 'fail', message });
    } else if (err) {
      if (err.message === 'Not a PDF file!') {
        return res.status(400).json({ status: 'fail', message: err.message });
      }
      console.error('Unknown Upload Related Error:', err);
      next(err);
    } else {
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
};

module.exports = app; // For testing purposes
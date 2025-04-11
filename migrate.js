#!/usr/bin/env node

// migrate.js - Database migration tool
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Migration registry schema
const setupMigrationRegistry = async () => {
  const schema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    executedAt: { type: Date, default: Date.now },
    description: String
  });
  
  return mongoose.models.MigrationRegistry || 
    mongoose.model('MigrationRegistry', schema);
};

// Define all migrations here
const migrations = [
  {
    id: '001-add-quiz-points-earned',
    description: 'Add quizPointsEarned field to all users',
    async execute() {
      const User = mongoose.model('User');
      console.log('Running migration: Adding quizPointsEarned field to users');
      
      const result = await User.updateMany(
        { quizPointsEarned: { $exists: false } },
        { $set: { quizPointsEarned: 0 } }
      );
      
      console.log(`Migration complete: ${result.modifiedCount} users updated with quizPointsEarned=0`);
      return result;
    }
  }
  // Add more migrations here as needed
];

// Command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// List all migrations and their status
async function listMigrations() {
  const MigrationRegistry = await setupMigrationRegistry();
  const executed = await MigrationRegistry.find().lean();
  const executedMap = new Map(executed.map(m => [m.id, m]));
  
  console.log('\n=== Available Migrations ===');
  console.log('ID                       | Status    | Description');
  console.log('-------------------------|-----------|------------');
  
  for (const migration of migrations) {
    const status = executedMap.has(migration.id) 
      ? `✅ ${new Date(executedMap.get(migration.id).executedAt).toISOString().split('T')[0]}` 
      : '❌ Pending';
    console.log(`${migration.id.padEnd(25)} | ${status} | ${migration.description}`);
  }
  console.log('');
}

// Run specific migration
async function runMigration(id) {
  const MigrationRegistry = await setupMigrationRegistry();
  const migration = migrations.find(m => m.id === id);
  
  if (!migration) {
    console.log(`Migration with ID "${id}" not found!`);
    return;
  }
  
  const isExecuted = !!(await MigrationRegistry.findOne({ id }));
  if (isExecuted) {
    console.log(`Migration "${id}" has already been executed.`);
    
    rl.question('Do you want to run it again? (y/N): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await executeMigration(migration);
      } else {
        console.log('Migration skipped.');
        showMainMenu();
      }
    });
  } else {
    await executeMigration(migration);
  }
}

// Execute a migration and record it
async function executeMigration(migration) {
  const MigrationRegistry = await setupMigrationRegistry();
  try {
    console.log(`Executing migration: ${migration.id} - ${migration.description}`);
    await migration.execute();
    
    // Record the execution
    await MigrationRegistry.findOneAndUpdate(
      { id: migration.id },
      {
        id: migration.id,
        description: migration.description,
        executedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`Migration "${migration.id}" completed successfully!\n`);
  } catch (error) {
    console.error(`Error executing migration "${migration.id}":`, error);
  }
  
  showMainMenu();
}

// Run all pending migrations
async function runAllPending() {
  const MigrationRegistry = await setupMigrationRegistry();
  
  for (const migration of migrations) {
    const isExecuted = !!(await MigrationRegistry.findOne({ id: migration.id }));
    
    if (!isExecuted) {
      try {
        console.log(`Executing migration: ${migration.id} - ${migration.description}`);
        await migration.execute();
        
        // Record the execution
        await MigrationRegistry.findOneAndUpdate(
          { id: migration.id },
          {
            id: migration.id,
            description: migration.description,
            executedAt: new Date()
          },
          { upsert: true, new: true }
        );
        
        console.log(`Migration "${migration.id}" completed successfully!`);
      } catch (error) {
        console.error(`Error executing migration "${migration.id}":`, error);
        console.log('Stopping migration process due to error.');
        break;
      }
    } else {
      console.log(`Skipping already executed migration: ${migration.id}`);
    }
  }
  
  console.log('\nAll pending migrations have been processed.\n');
  showMainMenu();
}

// Show main menu
function showMainMenu() {
  console.log('=== Database Migration Tool ===');
  console.log('1. List all migrations');
  console.log('2. Run specific migration');
  console.log('3. Run all pending migrations');
  console.log('4. Exit');
  
  rl.question('\nSelect an option (1-4): ', (answer) => {
    switch (answer) {
      case '1':
        listMigrations().then(() => showMainMenu());
        break;
      case '2':
        listMigrations().then(() => {
          rl.question('\nEnter migration ID to run: ', (id) => {
            runMigration(id);
          });
        });
        break;
      case '3':
        rl.question('\nAre you sure you want to run all pending migrations? (y/N): ', (confirm) => {
          if (confirm.toLowerCase() === 'y') {
            runAllPending();
          } else {
            console.log('Operation cancelled.\n');
            showMainMenu();
          }
        });
        break;
      case '4':
        console.log('Closing database connection...');
        mongoose.connection.close().then(() => {
          console.log('Database connection closed.');
          rl.close();
        });
        break;
      default:
        console.log('Invalid option. Please try again.\n');
        showMainMenu();
    }
  });
}

// Start the program
async function start() {
  const connected = await connectDB();
  if (connected) {
    showMainMenu();
  } else {
    rl.close();
  }
}

// Handle program exit
rl.on('close', () => {
  console.log('Migration tool exited.');
  process.exit(0);
});

// Run the program
start();
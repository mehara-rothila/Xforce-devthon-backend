// migrations/run-migrations.js
require('dotenv').config();
const mongoose = require('mongoose');
const MigrationRegistry = require('./migration-registry');

// Import all migrations
const migrations = [
  require('./001-add-quiz-points'),
  // Add more migrations here as your project evolves
];

async function runMigrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for migrations');
    
    // Run each migration if not already executed
    for (const migration of migrations) {
      const isExecuted = await MigrationRegistry.isExecuted(migration.id);
      
      if (isExecuted) {
        console.log(`Migration ${migration.id} already executed, skipping.`);
      } else {
        console.log(`Executing migration: ${migration.id} - ${migration.description}`);
        await migration.execute();
        console.log(`Migration ${migration.id} completed successfully.`);
      }
    }
    
    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

runMigrations();
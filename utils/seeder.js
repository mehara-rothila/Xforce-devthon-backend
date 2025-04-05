const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subject = require('../models/subjectModel');
const Quiz = require('../models/quizModel');
const ForumCategory = require('../models/forumCategoryModel');
const ForumTopic = require('../models/forumTopicModel');
const User = require('../models/userModel');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });

const seedDatabase = async () => {
  try {
    // Clear existing data
    await Promise.all([
      Subject.deleteMany(),
      Quiz.deleteMany(),
      ForumCategory.deleteMany(),
      ForumTopic.deleteMany(),
      User.deleteMany()
    ]);
    console.log('Database cleared');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@xforce.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Admin user created');

    // Subjects data
    const subjects = [
      {
        name: 'Physics',
        description: 'Study of matter, motion, energy, and force',
        color: '#3498db',
        gradientFrom: '#3498db',
        gradientTo: '#2980b9',
        icon: 'atom',
        topics: [
          { name: 'Mechanics', order: 1 },
          { name: 'Waves', order: 2 }
        ]
      },
      {
        name: 'Chemistry',
        description: 'Study of matter, its properties, and reactions',
        color: '#27ae60',
        gradientFrom: '#27ae60',
        gradientTo: '#2ecc71',
        icon: 'flask',
        topics: [
          { name: 'Periodic Table', order: 1 },
          { name: 'Chemical Bonds', order: 2 }
        ]
      }
    ];

    // Create subjects
    const createdSubjects = await Subject.insertMany(subjects);
    console.log(`${createdSubjects.length} subjects created`);

    // Create quizzes
    const quizzes = [
      {
        title: 'Physics Basics',
        subject: createdSubjects[0]._id,
        difficulty: 'medium',
        questions: [
          {
            text: 'What is velocity?',
            options: [
              { text: 'Speed in direction', isCorrect: true },
              { text: 'Rate of acceleration', isCorrect: false }
            ]
          }
        ]
      }
    ];
    const createdQuizzes = await Quiz.insertMany(quizzes);
    console.log(`${createdQuizzes.length} quizzes created`);

    // Forum data
    const forumCategories = [
      {
        name: 'General Discussion',
        description: 'General platform discussions',
        color: '#4a5568'
      }
    ];
    const createdCategories = await ForumCategory.insertMany(forumCategories);
    console.log(`${createdCategories.length} forum categories created`);

    // Forum topics
    const forumTopics = [
      {
        title: 'Welcome to Xforce!',
        content: 'Introduce yourself here',
        category: createdCategories[0]._id,
        author: adminUser._id
      }
    ];
    const createdTopics = await ForumTopic.insertMany(forumTopics);
    console.log(`${createdTopics.length} forum topics created`);

    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedDatabase();
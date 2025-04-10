// utils/achievementSeeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Achievement = require('../models/achievementModel');

// Load environment variables
dotenv.config({ path: './.env' });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful for achievement seeding'))
  .catch(err => console.error('DB connection error:', err));

// Define achievement data
const achievements = [
  {
    title: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: 'perfect_score',
    category: 'academic',
    xp: 100,
    points: 50,
    rarity: 'uncommon',
    trigger: 'quiz_perfect_score',
    requirement: 1
  },
  {
    title: 'Quiz Master',
    description: 'Complete 10 quizzes with a passing grade',
    icon: 'quiz_master',
    category: 'academic',
    xp: 150,
    points: 75,
    rarity: 'uncommon',
    trigger: 'quiz_completion',
    requirement: 10,
    condition: { passed: true }
  },
  {
    title: 'First Steps',
    description: 'Complete your first quiz',
    icon: 'first_steps',
    category: 'milestone',
    xp: 50,
    points: 25,
    rarity: 'common',
    trigger: 'quiz_completion',
    requirement: 1
  },
  {
    title: 'Mathematics Genius',
    description: 'Score above 90% in 5 consecutive Math quizzes',
    icon: 'math_genius',
    category: 'academic',
    xp: 250,
    points: 100,
    rarity: 'rare',
    trigger: 'quiz_completion',
    requirement: 5,
    condition: { minScore: 90, subject: 'Mathematics' }
  },
  {
    title: 'Helpful Mentor',
    description: 'Have your answer marked as "Best Answer" 10 times',
    icon: 'helpful_mentor',
    category: 'engagement',
    xp: 200,
    points: 100,
    rarity: 'uncommon',
    trigger: 'forum_best_answers',
    requirement: 10
  },
  {
    title: 'Resource Collector',
    description: 'Download at least one resource from each category',
    icon: 'resource_collector',
    category: 'milestone',
    xp: 150,
    points: 50,
    rarity: 'uncommon',
    trigger: 'resource_access',
    requirement: 5,
    condition: { accessType: 'download' }
  },
  {
    title: 'Exam Ace',
    description: 'Score in the top 5% nationally in any mock exam',
    icon: 'exam_ace',
    category: 'academic',
    xp: 500,
    points: 250,
    rarity: 'epic',
    trigger: 'quiz_completion',
    requirement: 1,
    condition: { isExam: true, percentile: 95 }
  },
  {
    title: '30-Day Commitment',
    description: 'Maintain a 30-day study streak',
    icon: 'commitment',
    category: 'milestone',
    xp: 300,
    points: 150,
    rarity: 'epic',
    trigger: 'study_streak',
    requirement: 30
  },
  {
    title: 'Subject Master',
    description: 'Score above 95% in 3 different subjects',
    icon: 'subject_master',
    category: 'academic',
    xp: 400,
    points: 200,
    rarity: 'epic',
    trigger: 'quiz_completion',
    requirement: 3,
    condition: { minScore: 95 }
  },
  {
    title: 'Challenge Seeker',
    description: 'Complete 20 hard difficulty quizzes',
    icon: 'challenge_seeker',
    category: 'milestone',
    xp: 300,
    points: 150,
    rarity: 'rare',
    trigger: 'quiz_completion',
    requirement: 20,
    condition: { difficulty: 'hard' }
  },
  {
    title: 'Discussion Starter',
    description: 'Create your first forum post',
    icon: 'discussion_starter',
    category: 'engagement',
    xp: 50,
    points: 25,
    rarity: 'common',
    trigger: 'forum_posts',
    requirement: 1
  }
];

// Seed function
const seedAchievements = async () => {
  try {
    // Delete existing achievements
    await Achievement.deleteMany();
    console.log('Deleted existing achievements');

    // Insert new achievements
    const createdAchievements = await Achievement.insertMany(achievements);
    console.log(`${createdAchievements.length} achievements created`);

    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding achievements:', error);
    mongoose.connection.close();
  }
};

// Run seeder
seedAchievements();
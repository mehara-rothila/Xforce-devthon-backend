// Forum seeder script
// Run with: node utils/forumSeeder.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ForumCategory = require('../models/forumCategoryModel');
const ForumTopic = require('../models/forumTopicModel');
const ForumReply = require('../models/forumReplyModel');
const User = require('../models/userModel');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for forum seeding'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Sample forum categories
const forumCategories = [
  {
    name: 'Physics Discussions',
    description: 'General discussions about physics topics',
    color: '#3498db',
    gradientFrom: '#3498db',
    gradientTo: '#2980b9',
    icon: 'atom'
  },
  {
    name: 'Chemistry Corner',
    description: 'Everything related to chemistry',
    color: '#27ae60',
    gradientFrom: '#27ae60',
    gradientTo: '#2ecc71',
    icon: 'flask'
  },
  {
    name: 'Mathematics Hub',
    description: 'Discussions about mathematics concepts and problems',
    color: '#9b59b6',
    gradientFrom: '#9b59b6',
    gradientTo: '#8e44ad',
    icon: 'calculator'
  },
  {
    name: 'Study Tips & Tricks',
    description: 'Share and discover effective study methods',
    color: '#e74c3c',
    gradientFrom: '#e74c3c',
    gradientTo: '#c0392b',
    icon: 'lightbulb'
  },
  {
    name: 'Exam Preparation',
    description: 'Get ready for your exams with these discussions',
    color: '#f39c12',
    gradientFrom: '#f39c12',
    gradientTo: '#d35400',
    icon: 'book'
  }
];

// Sample forum topics
const getForumTopics = (categories, users) => {
  return [
    {
      title: "Understanding Newton's Laws of Motion",
      content: "I'm having trouble understanding the practical applications of Newton's Third Law. Can someone explain with simple examples?",
      category: categories[0]._id, // Physics
      author: users[0]._id
    },
    {
      title: "Solving Complex Calculus Problems",
      content: "What's the best approach to solving integration by parts problems?",
      category: categories[2]._id, // Mathematics
      author: users[1]._id
    },
    {
      title: "Balancing Chemical Equations",
      content: "I struggle with balancing redox reactions. Any tips or methods that could help?",
      category: categories[1]._id, // Chemistry
      author: users[2]._id
    },
    {
      title: "Effective Study Techniques for Sciences",
      content: "What study techniques do you find most effective for memorizing scientific concepts?",
      category: categories[3]._id, // Study Tips
      author: users[0]._id
    },
    {
      title: "How to Prepare for Advanced Level Exams",
      content: "With only 3 months left for A/L exams, what should be my study strategy?",
      category: categories[4]._id, // Exam Preparation
      author: users[1]._id
    }
  ];
};

// Sample forum replies
const getForumReplies = (topics, users) => {
  return [
    {
      content: "Newton's Third Law states that for every action, there is an equal and opposite reaction. For example, when you push against a wall, the wall pushes back with equal force.",
      topic: topics[0]._id,
      author: users[1]._id
    },
    {
      content: "When swimming, you push water backwards, and the water pushes you forward with equal force. That's how you move forward in water!",
      topic: topics[0]._id,
      author: users[2]._id
    },
    {
      content: "For integration by parts, remember the formula: ∫u(x)v'(x)dx = u(x)v(x) - ∫u'(x)v(x)dx. Choose u and v wisely to simplify the problem.",
      topic: topics[1]._id,
      author: users[0]._id
    },
    {
      content: "For redox reactions, I find the half-reaction method very effective. Separate the reaction into oxidation and reduction half-reactions, balance them separately, then combine.",
      topic: topics[2]._id,
      author: users[1]._id
    },
    {
      content: "Active recall and spaced repetition are the most effective techniques for me. Instead of just reading, test yourself repeatedly on the material with increasing time intervals.",
      topic: topics[3]._id,
      author: users[2]._id
    },
    {
      content: "Create a detailed study schedule, focus on past papers, and form a study group. Understanding the exam pattern is crucial for success.",
      topic: topics[4]._id,
      author: users[0]._id
    }
  ];
};

// Function to seed database
const seedForumData = async () => {
  try {
    // Create mock users if none exist
    let users = await User.find().limit(3);
    
    if (users.length < 3) {
      console.log('Creating mock users for forum...');
      // Clear existing users
      await User.deleteMany();
      
      // Create mock users
      users = await User.create([
        {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          role: 'user'
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: 'password123',
          role: 'user'
        },
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'password123',
          role: 'admin'
        }
      ]);
      console.log(`${users.length} mock users created`);
    }
    
    // Clear existing forum data
    await ForumCategory.deleteMany();
    await ForumTopic.deleteMany();
    await ForumReply.deleteMany();
    console.log('Existing forum data cleared');
    
    // Create forum categories
    const categories = await ForumCategory.create(forumCategories);
    console.log(`${categories.length} forum categories created`);
    
    // Create forum topics
    const topicsData = getForumTopics(categories, users);
    const topics = await ForumTopic.create(topicsData);
    console.log(`${topics.length} forum topics created`);
    
    // Create forum replies
    const repliesData = getForumReplies(topics, users);
    const replies = await ForumReply.create(repliesData);
    console.log(`${replies.length} forum replies created`);
    
    // Update topic stats with reply counts
    for (const topic of topics) {
      const repliesCount = await ForumReply.countDocuments({ topic: topic._id });
      const lastReply = await ForumReply.findOne({ topic: topic._id }).sort('-createdAt');
      
      await ForumTopic.findByIdAndUpdate(topic._id, {
        repliesCount,
        lastReplyAt: lastReply ? lastReply.createdAt : topic.createdAt
      });
    }
    
    // Update category stats
    for (const category of categories) {
      const topicsCount = await ForumTopic.countDocuments({ category: category._id });
      const repliesCount = await ForumReply.countDocuments({
        topic: { $in: await ForumTopic.find({ category: category._id }).distinct('_id') }
      });
      
      await ForumCategory.findByIdAndUpdate(category._id, {
        topicsCount,
        postsCount: topicsCount + repliesCount
      });
    }
    
    console.log('Forum data seeded successfully');
    
  } catch (error) {
    console.error('Error seeding forum data:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
};

// Run the seeder
seedForumData();

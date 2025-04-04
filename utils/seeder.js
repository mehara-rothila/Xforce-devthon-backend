// Database seeder script
// Run with: node utils/seeder.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subject = require('../models/subjectModel');
const Quiz = require('../models/quizModel');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Sample data for subjects
const subjects = [
  {
    name: 'Physics',
    description: 'Study of matter, motion, energy, and force',
    color: '#3498db',
    gradientFrom: '#3498db',
    gradientTo: '#2980b9',
    icon: 'atom',
    topics: [
      { 
        name: 'Mechanics', 
        description: 'Study of motion and forces',
        order: 1 
      },
      { 
        name: 'Waves', 
        description: 'Study of wave properties and behavior',
        order: 2 
      },
      { 
        name: 'Thermodynamics', 
        description: 'Study of heat and temperature',
        order: 3 
      },
      { 
        name: 'Optics', 
        description: 'Study of light and vision',
        order: 4 
      }
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
      { 
        name: 'Periodic Table', 
        description: 'Classification of elements',
        order: 1 
      },
      { 
        name: 'Chemical Bonds', 
        description: 'Study of atomic bonding',
        order: 2 
      },
      { 
        name: 'Acids and Bases', 
        description: 'Study of pH and reactions',
        order: 3 
      },
      { 
        name: 'Organic Chemistry', 
        description: 'Study of carbon compounds',
        order: 4 
      }
    ]
  },
  {
    name: 'Combined Mathematics',
    description: 'Study of mathematical concepts and applications',
    color: '#9b59b6',
    gradientFrom: '#9b59b6',
    gradientTo: '#8e44ad',
    icon: 'calculator',
    topics: [
      { 
        name: 'Calculus', 
        description: 'Study of rates of change and accumulation',
        order: 1 
      },
      { 
        name: 'Vectors', 
        description: 'Study of magnitude and direction',
        order: 2 
      },
      { 
        name: 'Probability', 
        description: 'Study of chance and likelihood',
        order: 3 
      },
      { 
        name: 'Statistics', 
        description: 'Study of data collection and analysis',
        order: 4 
      }
    ]
  }
];

// Function to seed database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await Subject.deleteMany();
    await Quiz.deleteMany();
    console.log('Database cleared');
    
    // Create subjects
    const createdSubjects = await Subject.create(subjects);
    console.log(`${createdSubjects.length} subjects created`);
    
    // Create quizzes for Physics
    const physicsSubject = createdSubjects.find(s => s.name === 'Physics');
    
    // Create sample quiz for Physics
    const physicsQuiz = {
      title: 'Mechanics Basics Quiz',
      description: 'Test your knowledge of basic mechanics concepts',
      subject: physicsSubject._id,
      topic: physicsSubject.topics[0]._id, // Mechanics topic
      difficulty: 'medium',
      timeLimit: 15,
      questions: [
        {
          text: 'What is Newton\'s First Law of Motion?',
          options: [
            { text: 'Force equals mass times acceleration', isCorrect: false },
            { text: 'For every action, there is an equal and opposite reaction', isCorrect: false },
            { text: 'Objects in motion stay in motion unless acted upon by an external force', isCorrect: true },
            { text: 'Energy can neither be created nor destroyed', isCorrect: false }
          ],
          explanation: 'Newton\'s First Law, also known as the Law of Inertia, states that an object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force.',
          difficulty: 'medium',
          points: 10
        },
        {
          text: 'What is the SI unit of force?',
          options: [
            { text: 'Joule', isCorrect: false },
            { text: 'Newton', isCorrect: true },
            { text: 'Watt', isCorrect: false },
            { text: 'Pascal', isCorrect: false }
          ],
          explanation: 'The SI unit of force is the Newton (N), which is equal to 1 kg·m/s².',
          difficulty: 'easy',
          points: 5
        },
        {
          text: 'If you throw a ball upward, what is its acceleration at the highest point?',
          options: [
            { text: '0 m/s²', isCorrect: false },
            { text: '9.8 m/s²', isCorrect: true },
            { text: '9.8 m/s² upward', isCorrect: false },
            { text: 'It depends on the initial velocity', isCorrect: false }
          ],
          explanation: 'At the highest point, the velocity is zero but the acceleration due to gravity is still 9.8 m/s² downward.',
          difficulty: 'hard',
          points: 15
        }
      ]
    };
    
    // Create sample quiz for Chemistry
    const chemistrySubject = createdSubjects.find(s => s.name === 'Chemistry');
    
    const chemistryQuiz = {
      title: 'Periodic Table Quiz',
      description: 'Test your knowledge of the periodic table',
      subject: chemistrySubject._id,
      topic: chemistrySubject.topics[0]._id, // Periodic Table topic
      difficulty: 'easy',
      timeLimit: 10,
      questions: [
        {
          text: 'What is the chemical symbol for Gold?',
          options: [
            { text: 'Go', isCorrect: false },
            { text: 'Au', isCorrect: true },
            { text: 'Ag', isCorrect: false },
            { text: 'Gd', isCorrect: false }
          ],
          explanation: 'Gold\'s symbol Au comes from the Latin word "aurum"',
          difficulty: 'easy',
          points: 5
        },
        {
          text: 'Which element has the atomic number 1?',
          options: [
            { text: 'Helium', isCorrect: false },
            { text: 'Hydrogen', isCorrect: true },
            { text: 'Oxygen', isCorrect: false },
            { text: 'Carbon', isCorrect: false }
          ],
          explanation: 'Hydrogen has an atomic number of 1, meaning it has one proton in its nucleus.',
          difficulty: 'easy',
          points: 5
        }
      ]
    };
    
    // Create sample quiz for Mathematics
    const mathSubject = createdSubjects.find(s => s.name === 'Combined Mathematics');
    
    const mathQuiz = {
      title: 'Calculus Fundamentals',
      description: 'Test your understanding of basic calculus concepts',
      subject: mathSubject._id,
      topic: mathSubject.topics[0]._id, // Calculus topic
      difficulty: 'hard',
      timeLimit: 20,
      questions: [
        {
          text: 'What is the derivative of x²?',
          options: [
            { text: 'x', isCorrect: false },
            { text: '2x', isCorrect: true },
            { text: '2', isCorrect: false },
            { text: 'x³', isCorrect: false }
          ],
          explanation: 'Using the power rule, the derivative of x^n is n*x^(n-1). For x², n=2, so the derivative is 2x^(2-1) = 2x.',
          difficulty: 'medium',
          points: 10
        },
        {
          text: 'What is the integral of 2x?',
          options: [
            { text: 'x²', isCorrect: true },
            { text: '2x²', isCorrect: false },
            { text: 'x² + C', isCorrect: false },
            { text: 'x² + C', isCorrect: true }
          ],
          explanation: 'The integral of 2x is x² + C, where C is the constant of integration.',
          difficulty: 'medium',
          points: 10
        }
      ]
    };
    
    // Create the quizzes
    const createdQuizzes = await Quiz.create([physicsQuiz, chemistryQuiz, mathQuiz]);
    console.log(`${createdQuizzes.length} quizzes created`);
    
    console.log('Database seeded successfully');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
};

// Run the seeder
seedDatabase();
// utils/quizSeeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quiz = require('../models/quizModel'); // Use the CORRECTED model
const Subject = require('../models/subjectModel');
const QuizAttempt = require('../models/quizAttemptModel');

// Load environment variables (adjust path if your .env is elsewhere)
dotenv.config({ path: __dirname + '/../.env' });

const seedQuizzes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected for quiz seeding.');

        // --- 1. Find Subject IDs ---
        // Fetch IDs for subjects you want to link quizzes to. Adjust names as needed.
        const physicsSubject = await Subject.findOne({ name: 'Physics' }).select('_id').lean();
        const chemistrySubject = await Subject.findOne({ name: 'Chemistry' }).select('_id').lean();
        // Add more subjects if needed

        if (!physicsSubject || !chemistrySubject) {
            console.error('Error: Could not find required Subject documents (Physics, Chemistry). Please seed subjects first.');
            await mongoose.disconnect();
            return;
        }
        console.log('Found Subject IDs.');

        // --- 2. Clear Existing Data ---
        console.log('Deleting existing Quizzes and QuizAttempts...');
        await Quiz.deleteMany({});
        await QuizAttempt.deleteMany({}); // Delete attempts associated with old quizzes
        console.log('Existing quiz data cleared.');

        // --- 3. Define New Seed Data ---
        // IMPORTANT: Only define 'text' and 'isCorrect' for options.
        // Mongoose will add _id automatically, and the create/save logic
        // should handle setting the 'correctAnswer' field on the question.
        const quizzesToSeed = [
            {
                title: "Introduction to Kinematics (Seeded)",
                description: "Test your basic understanding of motion, displacement, velocity, and acceleration.",
                subject: physicsSubject._id, // Use the ObjectId found
                difficulty: "easy",
                timeLimit: 15,
                isPublished: true,
                passScore: 70,
                questions: [
                    {
                        text: "What is the SI unit of velocity?",
                        options: [
                            { text: "m/s^2", isCorrect: false },
                            { text: "m/s", isCorrect: true }, // Correct one marked
                            { text: "m", isCorrect: false },
                            { text: "s", isCorrect: false }
                        ],
                        // NO 'correctAnswer' here - let Mongoose/controller handle it
                        explanation: "Velocity is the rate of change of displacement, measured in meters per second (m/s).",
                        difficulty: "easy",
                        points: 10,
                    },
                    {
                        text: "What quantity describes the rate of change of velocity?",
                        options: [
                            { text: "Speed", isCorrect: false },
                            { text: "Displacement", isCorrect: false },
                            { text: "Acceleration", isCorrect: true }, // Correct one marked
                            { text: "Jerk", isCorrect: false }
                        ],
                        explanation: "Acceleration is defined as the rate at which velocity changes over time.",
                        difficulty: "easy",
                        points: 10,
                    }
                ],
            },
            {
                title: "Basic Chemical Bonding (Seeded)",
                description: "Understanding ionic and covalent bonds.",
                subject: chemistrySubject._id, // Use the ObjectId found
                difficulty: "medium", // Adjusted difficulty
                timeLimit: 10,
                isPublished: true,
                passScore: 75,
                questions: [
                    {
                        text: "Which type of bond involves the transfer of electrons?",
                        options: [
                            { text: "Ionic Bond", isCorrect: true }, // Correct one marked
                            { text: "Covalent Bond", isCorrect: false },
                            { text: "Metallic Bond", isCorrect: false },
                            { text: "Hydrogen Bond", isCorrect: false }
                        ],
                        explanation: "Ionic bonds form when one atom transfers electrons to another, creating ions that are electrostatically attracted.",
                        difficulty: "easy",
                        points: 10,
                    },
                    {
                        text: "Which type of bond involves the sharing of electrons?",
                        options: [
                            { text: "Ionic Bond", isCorrect: false },
                            { text: "Covalent Bond", isCorrect: true }, // Correct one marked
                            { text: "Metallic Bond", isCorrect: false },
                        ],
                        explanation: "Covalent bonds involve the sharing of electron pairs between atoms.",
                        difficulty: "medium",
                        points: 15, // Different points example
                    }
                ],
            }
            // Add more quiz objects here if needed
        ];

        // --- 4. Create Quizzes in DB ---
        // Use Quiz.create() which triggers Mongoose middleware/validation.
        // The controller logic for setting `correctAnswer` runs here implicitly
        // because `Quiz.create` effectively calls the necessary pre-save hooks
        // or schema processing where Mongoose adds the _id to options *before*
        // the `correctAnswer` logic might run (if it were a pre-save hook).
        // If `correctAnswer` is set in the *controller* `createQuiz` function
        // (as in your provided code), `Quiz.create(data)` essentially performs
        // the necessary steps internally.

        console.log('Creating new quiz documents...');
        const createdQuizzes = await Quiz.create(quizzesToSeed);
        console.log(`Successfully created ${createdQuizzes.length} quizzes.`);

        // --- Optional: Verification Step ---
        console.log('Verifying created data (first quiz)...');
        const firstCreatedQuiz = await Quiz.findById(createdQuizzes[0]._id);
        if (firstCreatedQuiz && firstCreatedQuiz.questions[0].options[0]._id) {
             console.log(` -> Option 1 ID: ${firstCreatedQuiz.questions[0].options[0]._id}`);
             console.log(` -> Question 1 Correct Answer Field: ${firstCreatedQuiz.questions[0].correctAnswer}`);
             const correctOptionIndex = firstCreatedQuiz.questions[0].options.findIndex(o => o.isCorrect);
             const correctOptionId = firstCreatedQuiz.questions[0].options[correctOptionIndex]?._id?.toString();
             if (firstCreatedQuiz.questions[0].correctAnswer === correctOptionId) {
                 console.log(' -> Verification PASSED: CorrectAnswer field matches the ID of the correct option.');
             } else {
                  console.error(' -> Verification FAILED: CorrectAnswer field does NOT match the ID of the correct option!');
             }

        } else {
             console.error(' -> Verification FAILED: Could not retrieve created quiz or options lack IDs.');
        }


    } catch (error) {
        console.error('Quiz seeding script failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

// Run the seeder function
seedQuizzes();
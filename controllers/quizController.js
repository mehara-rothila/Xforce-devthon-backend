// controllers/quizController.js
const mongoose = require('mongoose');
const Quiz = require('../models/quizModel');
const Subject = require('../models/subjectModel');
const QuizAttempt = require('../models/quizAttemptModel');
const User = require('../models/userModel');

/**
 * @desc    Get all quizzes with filtering, sorting, pagination, and total count
 * @route   GET /api/quizzes
 * @access  Public
 */
exports.getAllQuizzes = async (req, res, next) => {
  try {
    // --- Filtering ---
    let queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search']; // Added 'search'
    excludedFields.forEach(field => delete queryObj[field]);

    // Add specific filters based on query parameters
    // Example: Filter by difficulty
    if (req.query.difficulty) {
        queryObj.difficulty = req.query.difficulty;
    }

    // --- CORRECTED Published Status Filter ---
    // Default to published=true only if the parameter is completely missing
    if (req.query.isPublished === undefined) {
        console.log("isPublished not provided, defaulting to true.");
        queryObj.isPublished = true;
    } else if (req.query.isPublished === 'false') {
        console.log("isPublished is 'false', fetching unpublished.");
        queryObj.isPublished = false; // Explicitly fetch only unpublished
    } else if (req.query.isPublished === 'true') {
        console.log("isPublished is 'true', fetching published.");
        queryObj.isPublished = true; // Explicitly fetch only published
    } else if (req.query.isPublished === 'all') {
        // If 'all', remove the isPublished property from the query object
        // so it doesn't filter by published status at all.
        console.log("isPublished is 'all', removing filter.");
        delete queryObj.isPublished;
    } else {
        // Optional: Handle invalid isPublished values, or default to published
        // For safety, let's default to published if an unknown value is passed
        console.warn(`Invalid isPublished value received: ${req.query.isPublished}. Defaulting to true.`);
        queryObj.isPublished = true;
    }
    // --- End CORRECTED Filter ---


    // Handle text search (if needed, add search logic similar to resources)
    if (req.query.search) {
      queryObj.title = { $regex: req.query.search, $options: 'i' };
    }

    // --- Handle Subject Filter (Single or Multiple) ---
    if (req.query.subject) {
        const subjectIds = req.query.subject.split(',') // Split by comma
            .map(id => id.trim()) // Remove whitespace
            .filter(id => mongoose.Types.ObjectId.isValid(id)); // Keep only valid ObjectIds

        if (subjectIds.length > 0) {
            // Use $in operator to match any of the valid IDs
            queryObj.subject = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else {
             console.warn("Quiz subject filter provided but contained no valid ObjectIds:", req.query.subject);
             // Match nothing if filter is present but invalid
             queryObj._id = null; // Or handle as needed: maybe return empty results immediately?
        }
    }
    // --- End Subject Filter ---

    console.log("Final Query Object:", queryObj); // Log the final query object for debugging

    // --- Total Count ---
    // Calculate total count matching filters BEFORE pagination
    const totalResults = await Quiz.countDocuments(queryObj);
    console.log("Total results found:", totalResults);

    // --- Main Query Execution ---
    let query = Quiz.find(queryObj);

    // --- Sorting ---
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt'); // Default sort
    }


    // --- Field Limiting ---
     if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v'); // Exclude __v by default
    }


    // --- Pagination ---
    const page = parseInt(req.query.page, 10) || 1;
    // Use a higher limit for admin view, or keep the original default
    const limit = parseInt(req.query.limit, 10) || 100; // Default limit (adjust as needed)
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);


    // Populate subject field
    query = query.populate({
      path: 'subject',
      select: 'name color icon' // Select fields you need from Subject
    });

    // Execute query
    const quizzes = await query;
    console.log("Quizzes fetched for current page:", quizzes.length);


    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit);

    // --- Send Response ---
    res.status(200).json({
      status: 'success',
      totalResults: totalResults, // Total matching documents
      results: quizzes.length, // Results on current page
      totalPages: totalPages,
      currentPage: page,
      data: {
        quizzes // Paginated quizzes
      }
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    next(error); // Pass error to global handler
  }
};

/**
 * @desc    Get quiz by ID
 * @route   GET /api/quizzes/:id
 * @access  Public
 */
exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate({
      path: 'subject',
      select: 'name color icon'
    }); 

    if (!quiz) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        quiz
      }
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    next(error); // Pass error to handler
  }
};

/**
 * @desc    Create a new quiz
 * @route   POST /api/quizzes
 * @access  Private/Admin (Apply middleware in routes)
 */
exports.createQuiz = async (req, res, next) => {
  try {
    // Basic validation
     if (!req.body.subject || !mongoose.Types.ObjectId.isValid(req.body.subject)) {
         return res.status(400).json({ status: 'fail', message: 'Valid subject ID is required.' });
     }
     if (!req.body.title) {
         return res.status(400).json({ status: 'fail', message: 'Quiz title is required.' });
     }
     // Add more validation as needed (e.g., questions array)

    // Validate that subject exists
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    // Create quiz
    const newQuizData = {
      ...req.body,
      createdBy: req.user ? req.user.id : undefined // Get user from auth middleware if available
    };

    // Ensure options within questions have IDs if they are missing (though model should handle this if not disabled)
    if (newQuizData.questions && Array.isArray(newQuizData.questions)) {
        newQuizData.questions.forEach(q => {
            if (q.options && Array.isArray(q.options)) {
                q.options.forEach(opt => {
                    if (!opt._id) {
                        opt._id = new mongoose.Types.ObjectId(); // Assign new ID if missing
                    }
                });
                // Ensure correctAnswer points to a valid option _id within the question
                const correctOption = q.options.find(opt => opt.isCorrect);
                if (correctOption && correctOption._id) {
                    q.correctAnswer = correctOption._id.toString();
                } else {
                    // Handle cases where no correct answer is marked or options are missing IDs
                    console.warn(`Question "${q.text}" might be missing a correct answer or option IDs.`);
                    q.correctAnswer = null; // Or handle as appropriate
                }
            }
        });
    }

    const newQuiz = await Quiz.create(newQuizData);

    res.status(201).json({
      status: 'success',
      data: {
        quiz: newQuiz
      }
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
     if (error.name === 'ValidationError') {
         return res.status(400).json({ status: 'fail', message: error.message });
    }
    next(error); // Pass other errors
  }
};

/**
 * @desc    Update a quiz
 * @route   PATCH /api/quizzes/:id
 * @access  Private/Admin (Apply middleware in routes)
 */
exports.updateQuiz = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Ensure options within questions have IDs if they are missing
    // And update correctAnswer based on isCorrect flag
    if (updateData.questions && Array.isArray(updateData.questions)) {
        updateData.questions.forEach(q => {
            if (q.options && Array.isArray(q.options)) {
                let foundCorrectAnswerId = null;
                q.options.forEach(opt => {
                    // Ensure option has an ID, generate if missing (important for updates)
                    if (!opt._id) {
                        opt._id = new mongoose.Types.ObjectId();
                    }
                    if (opt.isCorrect) {
                        foundCorrectAnswerId = opt._id.toString();
                    }
                });
                 // Update the question's correctAnswer field
                q.correctAnswer = foundCorrectAnswerId;
            } else {
                 q.correctAnswer = null; // No options, no correct answer
            }
        });
    }

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      updateData, // Use the potentially modified updateData
      { new: true, runValidators: true }
    );

    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        quiz
      }
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
     if (error.name === 'ValidationError') {
         return res.status(400).json({ status: 'fail', message: error.message });
    }
    next(error); // Pass other errors
  }
};

/**
 * @desc    Delete a quiz
 * @route   DELETE /api/quizzes/:id
 * @access  Private/Admin (Apply middleware in routes)
 */
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    // Delete all associated quiz attempts
    await QuizAttempt.deleteMany({ quiz: req.params.id });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    next(error); // Pass error to handler
  }
};

/**
 * @desc    Submit a quiz attempt
 * @route   POST /api/quizzes/:id/attempts
 * @access  Private (Apply middleware in routes)
 */
exports.submitQuizAttempt = async (req, res, next) => {
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request params:', JSON.stringify(req.params, null, 2));
    console.log('Request user:', req.user);
    
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    // Basic validation
    const { answers, timeTaken } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ status: 'fail', message: 'Answers must be provided as an array' });
    }

    // --- Score Calculation Logic ---
    let score = 0;
    let totalPoints = 0;
    
    // Process answers
    const processedAnswers = answers.map(answer => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return { ...answer, isCorrect: false };
      
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;
      
      let isCorrect = false;
      if (question.correctAnswer && answer.answerId === question.correctAnswer.toString()) {
        score += questionPoints;
        isCorrect = true;
      }
      
      return {
        questionId: answer.questionId,
        answerId: answer.answerId,
        isCorrect
      };
    });

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentageScore >= (quiz.passScore || 0);

    // Update quiz attempts count
    quiz.attempts = (quiz.attempts || 0) + 1;
    await quiz.save({ validateBeforeSave: false });

    // Save the attempt details to QuizAttempt collection if user is authenticated
    let attemptId = null;
    
    // For testing - handle anonymous submissions
    if (req.user && req.user.id) {
      try {
        const attempt = await QuizAttempt.create({
          user: req.user.id,
          quiz: quiz._id,
          answers: processedAnswers,
          score: score,
          totalPoints: totalPoints,
          percentageScore: percentageScore,
          passed: passed,
          timeTaken: timeTaken || null
        });
        attemptId = attempt._id;
        
        // Award XP for registered users
        if (passed) {
          try {
            // Award XP to the user based on quiz difficulty and score
            const xpGained = Math.floor(percentageScore * 0.5); // Simple XP calculation
            
            // Update user XP
            const user = await User.findById(req.user.id);
            if (user) {
              user.xp += xpGained;
              
              // Check for level up - simple level formula
              const oldLevel = user.level;
              const newLevel = Math.floor(1 + Math.sqrt(user.xp / 100));
              
              if (newLevel > oldLevel) {
                user.level = newLevel;
              }
              
              await user.save();
            }
          } catch (xpError) {
            console.error('Error updating user XP:', xpError);
            // Continue even if XP update fails
          }
        }
      } catch (attemptError) {
        console.error('Error saving quiz attempt:', attemptError);
        // Continue even if saving the attempt fails - we'll still return the score
      }
    } else {
      console.log('Quiz submitted anonymously (no user authentication)');
    }

    // Return the results regardless of whether we saved the attempt
    res.status(200).json({
      status: 'success',
      message: 'Quiz attempt submitted successfully.',
      data: { 
        attemptId,
        score, 
        totalPoints, 
        percentageScore, 
        passed 
      }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Error processing quiz attempt: ' + (error.message || 'Unknown error')
    });
  }
};

/**
 * @desc    Get quizzes for a specific subject
 * @route   GET /api/subjects/:id/quizzes (Note: This route might be defined in subjectRoutes.js)
 * @access  Public
 */
exports.getQuizzesForSubject = async (req, res, next) => {
  try {
    const subjectId = req.params.id; // Assuming subject ID is passed as :id
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID' });
    }
    // Optional: Check if subject exists
    // const subject = await Subject.findById(subjectId);
    // if (!subject) {
    //   return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    // }

    // Add filtering/pagination if needed from req.query
    const queryObj = { subject: subjectId, isPublished: true }; // Default to only published for this view
    const totalResults = await Quiz.countDocuments(queryObj);
    const quizzes = await Quiz.find(queryObj)
                              .populate('subject', 'name color')
                              .sort('-createdAt') // Example sort
                              .limit(10); // Example limit

    res.status(200).json({
      status: 'success',
      totalResults: totalResults,
      results: quizzes.length,
      data: { quizzes }
    });
  } catch (error) {
    console.error('Error fetching quizzes for subject:', error);
    next(error);
  }
};

/**
 * @desc    Get practice quizzes for a subject (Example for subject detail page)
 * @route   GET /api/quizzes/subject/:subjectId/practice
 * @access  Public
 */
exports.getPracticeQuizzes = async (req, res, next) => {
  try {
    const subjectId = req.params.subjectId;
     if (!mongoose.Types.ObjectId.isValid(subjectId)) {
         return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID' });
    }

    const query = {
      subject: subjectId,
      isPublished: true // Only show published quizzes as practice
    };

    // Apply topic filter if provided and valid
    if (req.query.topic && mongoose.Types.ObjectId.isValid(req.query.topic)) {
      query.topic = req.query.topic; // Assuming 'topic' field exists in Quiz model linking to a Topic ID
    }

    const quizzes = await Quiz.find(query)
      .sort({ attempts: -1 }) // Example sort: most attempted
      .limit(6); // Limit to a few practice quizzes

    // Get user's previous attempts if authenticated
    let userAttempts = [];
    if (req.user && req.user._id) {
      userAttempts = await QuizAttempt.find({ 
        user: req.user._id,
        quiz: { $in: quizzes.map(q => q._id) }
      }).sort({ createdAt: -1 });
    }

    // Format quizzes for practice display
    const practiceQuizzes = quizzes.map(quiz => {
      // Check if user has attempted this quiz
      const userAttempt = userAttempts.find(a => a.quiz.toString() === quiz._id.toString());
      
      return {
        id: quiz._id,
        title: quiz.title,
        questions: quiz.questions?.length || 0,
        difficulty: quiz.difficulty,
        timeEstimate: quiz.timeLimit ? `${quiz.timeLimit} min` : 'N/A',
        attempts: quiz.attempts || 0,
        userScore: userAttempt ? userAttempt.percentageScore : null,
        userAttempted: !!userAttempt,
        userPassed: userAttempt ? userAttempt.passed : false
      };
    });

    res.status(200).json({
      status: 'success',
      results: practiceQuizzes.length,
      data: { practiceQuizzes }
    });
  } catch (error) {
    console.error('Error fetching practice quizzes:', error);
    next(error);
  }
};

/**
 * @desc    Get user's quiz attempts
 * @route   GET /api/quizzes/user/:userId/attempts
 * @access  Private
 */
exports.getUserQuizAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only see their own attempts (unless admin)
    if (req.user && req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access these records'
      });
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Get attempts with populated quiz details
    const attempts = await QuizAttempt.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'quiz',
        select: 'title difficulty subject',
        populate: {
          path: 'subject',
          select: 'name color'
        }
      });
    
    // Count total attempts
    const totalAttempts = await QuizAttempt.countDocuments({ user: userId });
    
    // Format the response
    const formattedAttempts = attempts.map(attempt => ({
      id: attempt._id,
      quizId: attempt.quiz._id,
      quizTitle: attempt.quiz.title,
      subject: attempt.quiz.subject.name,
      subjectColor: attempt.quiz.subject.color,
      difficulty: attempt.quiz.difficulty,
      score: attempt.percentageScore,
      passed: attempt.passed,
      timeTaken: attempt.timeTaken, // In seconds
      date: attempt.createdAt
    }));
    
    res.status(200).json({
      status: 'success',
      results: formattedAttempts.length,
      totalResults: totalAttempts,
      totalPages: Math.ceil(totalAttempts / limit),
      currentPage: page,
      data: {
        attempts: formattedAttempts
      }
    });
  } catch (error) {
    console.error('Error fetching user quiz attempts:', error);
    next(error);
  }
};

// Helper function for average score (for demo purposes)
function calculateAverageScore(quiz) {
  switch (quiz.difficulty) {
    case 'easy': return Math.floor(Math.random() * 15) + 75; // 75-90
    case 'medium': return Math.floor(Math.random() * 20) + 65; // 65-85
    case 'hard': return Math.floor(Math.random() * 20) + 55; // 55-75
    default: return 70;
  }
}
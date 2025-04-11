// controllers/quizController.js
const mongoose = require('mongoose');
const Quiz = require('../models/quizModel');
const Subject = require('../models/subjectModel');
const QuizAttempt = require('../models/quizAttemptModel');
const User = require('../models/userModel');
const achievementController = require('./achievementController');

/**
 * @desc     Get all quizzes with filtering, sorting, pagination, and total count
 * @route    GET /api/quizzes
 * @access   Public
 */
exports.getAllQuizzes = async (req, res, next) => {
  try {
    // --- Filtering ---
    let queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search']; // Added 'search'
    excludedFields.forEach(field => delete queryObj[field]);

    // Add specific filters based on query parameters
    // Example: Filter by difficulty
    if (req.query.difficulty && req.query.difficulty !== 'all') { // Handle 'all' filter
        queryObj.difficulty = req.query.difficulty;
    } else {
        delete queryObj.difficulty; // Remove if 'all' or not provided
    }

    // --- CORRECTED Published Status Filter ---
    // Default to published=true only if the parameter is completely missing or explicitly 'true'
    if (req.query.isPublished === 'false') {
      console.log("isPublished is 'false', fetching unpublished.");
      queryObj.isPublished = false; // Explicitly fetch only unpublished
    } else if (req.query.isPublished === 'all') {
      // If 'all', remove the isPublished property from the query object
      console.log("isPublished is 'all', removing filter.");
      delete queryObj.isPublished;
    } else {
        // Default to published=true (if undefined, 'true', or any other value)
        console.log(`isPublished is '${req.query.isPublished}', defaulting to true.`);
        queryObj.isPublished = true;
    }
    // --- End CORRECTED Filter ---

    // Handle text search
    if (req.query.search) {
      queryObj.title = { $regex: req.query.search, $options: 'i' };
    }

    // --- Handle Subject Filter (Single or Multiple) ---
    if (req.query.subject && req.query.subject !== 'all') { // Handle 'all' filter
        const subjectIds = req.query.subject.split(',') // Split by comma
            .map(id => id.trim()) // Remove whitespace
            .filter(id => mongoose.Types.ObjectId.isValid(id)); // Keep only valid ObjectIds

        if (subjectIds.length > 0) {
            // Use $in operator to match any of the valid IDs
            queryObj.subject = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else {
             console.warn("Quiz subject filter provided but contained no valid ObjectIds:", req.query.subject);
             // Match nothing if filter is present but invalid
             queryObj._id = new mongoose.Types.ObjectId(); // Generate a non-existent ID to return 0 results
        }
    } else {
        delete queryObj.subject; // Remove if 'all' or not provided
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
    }).lean({ virtuals: true }); // Include virtuals like totalQuestions

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
 * @desc     Get quiz by ID
 * @route    GET /api/quizzes/:id
 * @access   Public
 */
exports.getQuizById = async (req, res, next) => {
  try {
    // Populate subject and include virtuals for the detail view
    const quiz = await Quiz.findById(req.params.id)
        .populate({
          path: 'subject',
          select: 'name color icon'
        })
        .lean({ virtuals: true }); // Fetch virtuals like totalQuestions, totalPoints

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
 * @desc     Create a new quiz
 * @route    POST /api/quizzes
 * @access   Private/Admin (Apply middleware in routes)
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
     // Add more validation as needed (e.g., questions array non-empty?)

    // Validate that subject exists
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    // Prepare quiz data
    const newQuizData = {
      ...req.body,
      createdBy: req.user?._id // Get user from auth middleware (ensure protect middleware runs)
    };

    // Note: The pre-save hook in quizModel.js will handle setting correctAnswer based on isCorrect flag
    // and ensuring option IDs exist before the actual save.

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
 * @desc     Update a quiz
 * @route    PATCH /api/quizzes/:id
 * @access   Private/Admin (Apply middleware in routes)
 */
exports.updateQuiz = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Prevent direct update of certain fields if necessary
    // delete updateData.attempts;
    // delete updateData.createdBy;
    // delete updateData.rating; // Rating might be calculated elsewhere

    // Note: The pre-save hook in quizModel.js will handle updating correctAnswer
    // based on isCorrect flags if the 'questions' array is modified during the update.
    // Mongoose handles subdocument ID generation automatically.

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      updateData, // Pass the update data
      { new: true, runValidators: true } // Return updated doc, run schema validators
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
 * @desc     Delete a quiz
 * @route    DELETE /api/quizzes/:id
 * @access   Private/Admin (Apply middleware in routes)
 */
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    // Delete all associated quiz attempts
    const deleteResult = await QuizAttempt.deleteMany({ quiz: req.params.id });
    console.log(`Deleted ${deleteResult.deletedCount} associated quiz attempts for quiz ${req.params.id}`);

    res.status(204).json({ status: 'success', data: null }); // 204 No Content
  } catch (error) {
    console.error('Error deleting quiz:', error);
    next(error); // Pass error to handler
  }
};

/**
 * @desc     Submit a quiz attempt
 * @route    POST /api/quizzes/:id/attempts
 * @access   Private (Requires 'protect' middleware in routes)
 */
exports.submitQuizAttempt = async (req, res, next) => {
  // Add log at the very beginning to check req.user
  console.log('[submitQuizAttempt] req.user at start:', JSON.stringify(req.user));
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request params:', JSON.stringify(req.params, null, 2));
    // console.log('Request user:', req.user); // Redundant with the log above

    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId).populate('subject').lean({ virtuals: true });
    if (!quiz) return res.status(404).json({ status: 'fail', message: 'Quiz not found' });

    // Basic validation
    const { answers, timeTaken } = req.body;
    if (!answers || !Array.isArray(answers)) return res.status(400).json({ status: 'fail', message: 'Answers must be provided as an array' });

    // --- Score Calculation Logic ---
    let score = 0, totalPoints = quiz.totalPoints || 0, correctCount = 0, questionsInAttempt = 0;

    // Calculate totalPoints manually if not available from virtuals (fallback)
    if (totalPoints === 0) {
      console.warn("Quiz totalPoints virtual not available, calculating manually.");
      totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }

    // Process answers
    const processedAnswers = answers.map(answer => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) { console.warn(`Question ID ${answer.questionId} from submission not found in quiz ${quizId}. Skipping.`); return null; }

      questionsInAttempt++;
      const questionPoints = question.points || 0;
      let isCorrect = false;
      if (question.correctAnswer && answer.answerId === question.correctAnswer.toString()) {
        score += questionPoints;
        correctCount += 1;
        isCorrect = true;
      }

      return { questionId: answer.questionId, answerId: answer.answerId, isCorrect };
    }).filter(a => a !== null);

    // Calculate percentage score based on the total points of the QUIZ, not just answered questions
    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passScore = quiz.passScore || 70;
    const passed = percentageScore >= passScore;

    // Update quiz attempts count
    await Quiz.findByIdAndUpdate(quizId, { $inc: { attempts: 1 } });

    // --- POINTS SYSTEM CALCULATION ---
    const calculatePointsAwarded = () => {
      const difficultyMultiplier = { 'easy': 1, 'medium': 1.5, 'hard': 2.5 }[quiz.difficulty] || 1;
      const basePoints = 10;
      const questionCountFactor = Math.min(2, Math.log10(quiz.questions.length + 1) + 0.5);
      const perfectScoreBonus = percentageScore === 100 ? 1.2 : 1;
      let timeBonus = 1;
      if (timeTaken && quiz.timeLimit && quiz.timeLimit > 0) {
        const timePercentage = timeTaken / (quiz.timeLimit * 60);
        if (timePercentage < 0.5) timeBonus = 1.1;
      }
      const rawPoints = basePoints * difficultyMultiplier * (percentageScore / 100) * questionCountFactor * perfectScoreBonus * timeBonus;
      return Math.max(1, Math.round(rawPoints));
    };
    const pointsAwarded = calculatePointsAwarded();
    console.log(`Points awarded for quiz completion: ${pointsAwarded}`);

    // --- XP CALCULATION ---
    const xpMultiplier = { 'easy': 1, 'medium': 1.5, 'hard': 2 }[quiz.difficulty] || 1;
    const xpAwarded = Math.floor(percentageScore * 0.5 * xpMultiplier);
    console.log(`XP awarded for quiz completion: ${xpAwarded}`);

    // --- Save attempt and Update User Stats (if authenticated) ---
    let attemptId = null;
    let achievementResults = { awarded: [] };

    // Check if user is authenticated
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        // 1. Save quiz attempt
        const attempt = await QuizAttempt.create({
          user: userId, quiz: quiz._id, answers: processedAnswers, score: score,
          totalPoints: totalPoints, percentageScore: percentageScore, passed: passed,
          timeTaken: timeTaken || null, pointsAwarded: pointsAwarded
        });
        attemptId = attempt._id;
        console.log(`Quiz attempt ${attemptId} saved for user ${userId}`);

        // --- ADDED CONSOLE LOG 1 ---
        // Log the values *before* the update operation
        console.log(`[submitQuizAttempt] BEFORE UPDATE - Incrementing stats for user ${userId}: XP+=${xpAwarded}, Points+=${pointsAwarded}, QuizPoints+=${pointsAwarded}, Completed+=1, ScoreSum+=${percentageScore}`);

        // 2. Update user's aggregate stats and level-related fields
        const userUpdate = await User.findByIdAndUpdate(
          userId,
          {
            $inc: {
              xp: xpAwarded,                     // Increment XP
              points: pointsAwarded,             // Increment total points
              quizPointsEarned: pointsAwarded,   // Increment quiz-specific points
              quizCompletedCount: 1,             // Increment completed count by 1
              quizTotalPercentageScoreSum: percentageScore // Add this attempt's score % to the sum
            }
          },
          { new: true } // Return the updated document
        );

        // --- ADDED CONSOLE LOG 2 ---
        // Log the result *after* the update operation
        if (userUpdate) {
            console.log(`[submitQuizAttempt] AFTER UPDATE - User data: XP=${userUpdate.xp}, Points=${userUpdate.points}, QuizPoints=${userUpdate.quizPointsEarned}, Completed=${userUpdate.quizCompletedCount}, ScoreSum=${userUpdate.quizTotalPercentageScoreSum}`);
        } else {
            console.warn(`[submitQuizAttempt] AFTER UPDATE - User ${userId} not found during update. Stats not updated.`);
        }
        // --- END ADDED CONSOLE LOGS ---

        if (!userUpdate) {
          // This warning is now slightly redundant due to the log above, but keep it for clarity
          console.warn(`[submitQuizAttempt] User ${userId} not found during update. Stats not updated.`);
        } else {
          // Check for level up based on the updated XP
          const oldLevel = userUpdate.level;
          // Ensure xp is treated as a number for calculation
          const currentXP = typeof userUpdate.xp === 'number' ? userUpdate.xp : 0;
          const newLevel = Math.floor(1 + Math.sqrt(currentXP / 100));

          if (newLevel > oldLevel) {
            await User.findByIdAndUpdate(userId, { level: newLevel });
            console.log(`User ${userId} leveled up from ${oldLevel} to level ${newLevel}!`);
          }

          // 4. Check for quiz-related achievements
          achievementResults = await achievementController.checkQuizAchievements(userId, {
            percentageScore, passed, difficulty: quiz.difficulty,
            quizId: quiz._id.toString(), subject: quiz.subject?._id?.toString() || null
          });
          console.log(`Checked achievements for user ${userId}. Awarded: ${achievementResults.awarded.length}`);
        }
      } catch (error) {
        console.error(`Error processing authenticated quiz attempt for user ${userId}:`, error);
        // Consider how to handle this - should the user see an error?
        // Maybe set a flag to indicate stat update failure in the response?
      }
    } else {
      console.log('Quiz submitted anonymously (no user authentication) OR req.user was missing.');
    }

    // --- Prepare and Send Response ---
    // Ensure pointsAwarded and xpAwarded are included even if user update failed or was skipped
    const responseData = {
      attemptId, score, totalPoints, percentageScore, passed, correctAnswers: correctCount,
      totalQuestions: quiz.questions.length, pointsAwarded, xpAwarded, achievements: achievementResults.awarded
    };

    console.log("Sending quiz submission response:", responseData);
    res.status(200).json({
      status: 'success',
      message: 'Quiz attempt submitted successfully.',
      data: responseData
    });
  } catch (error) {
    console.error('Outer error submitting quiz attempt:', error);
    if (!res.headersSent) next(error);
  }
};

/**
 * @desc     Get quizzes for a specific subject
 * @route    GET /api/subjects/:id/quizzes (Note: Route definition likely in subjectRoutes.js)
 * @access   Public
 */
exports.getQuizzesForSubject = async (req, res, next) => {
  try {
    const subjectId = req.params.id; // Assuming subject ID is passed as :id in the route
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID' });
    }

    // Optional: Check if subject exists
    // const subject = await Subject.findById(subjectId);
    // if (!subject) {
    //   return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    // }

    // Add filtering/pagination if needed from req.query, similar to getAllQuizzes
    const queryObj = { subject: subjectId, isPublished: true }; // Default to only published for this view

    // Example: Apply difficulty filter if provided
    if (req.query.difficulty && req.query.difficulty !== 'all') {
       queryObj.difficulty = req.query.difficulty;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Default limit per page
    const skip = (page - 1) * limit;

    const totalResults = await Quiz.countDocuments(queryObj);
    const quizzes = await Quiz.find(queryObj)
                              .populate('subject', 'name color') // Populate relevant subject fields
                              .sort(req.query.sort || '-createdAt') // Allow sorting, default to newest
                              .skip(skip)
                              .limit(limit)
                              .lean({ virtuals: true }); // Include virtuals

    res.status(200).json({
      status: 'success',
      totalResults: totalResults,
      results: quizzes.length,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
      data: { quizzes }
    });
  } catch (error) {
    console.error('Error fetching quizzes for subject:', error);
    next(error);
  }
};

/**
 * @desc     Get practice quizzes for a subject (Example for subject detail page)
 * @route    GET /api/quizzes/subject/:subjectId/practice
 * @access   Public
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

    // Apply topic filter if provided and valid (Assuming a 'topic' field links to Topic ID)
    if (req.query.topic && mongoose.Types.ObjectId.isValid(req.query.topic)) {
      query.topic = req.query.topic;
    }

    // Fetch quizzes, sorting, limiting, including virtuals
    const quizzes = await Quiz.find(query)
      .sort({ attempts: -1 }) // Example sort: most attempted first
      .limit(6) // Limit to a few practice quizzes
      .lean({ virtuals: true }); // Fetch virtuals like totalQuestions

    // Get user's previous attempts if authenticated
    let userAttemptsMap = new Map(); // Use a Map for efficient lookup
    if (req.user && req.user.id) { // Use req.user provided by auth middleware
      const userAttemptDocs = await QuizAttempt.find({
        user: req.user.id,
        quiz: { $in: quizzes.map(q => q._id) } // Find attempts only for the fetched quizzes
      }).sort({ createdAt: -1 }); // Sort by most recent attempt

      // Populate the map, keeping only the latest attempt per quiz
      userAttemptDocs.forEach(attempt => {
          if (!userAttemptsMap.has(attempt.quiz.toString())) {
              userAttemptsMap.set(attempt.quiz.toString(), attempt);
          }
      });
    }

    // Format quizzes for practice display, including user attempt info
    const practiceQuizzes = quizzes.map(quiz => {
      const userAttempt = userAttemptsMap.get(quiz._id.toString()); // Get latest attempt for this quiz

      return {
        id: quiz._id,
        title: quiz.title,
        questions: quiz.totalQuestions || 0, // Use virtual totalQuestions
        difficulty: quiz.difficulty,
        timeEstimate: quiz.timeLimit ? `${quiz.timeLimit} min` : 'N/A',
        attempts: quiz.attempts || 0,
        userScore: userAttempt ? userAttempt.percentageScore : null, // Score from latest attempt
        userAttempted: !!userAttempt, // Has the user attempted this quiz?
        userPassed: userAttempt ? userAttempt.passed : null // Passed status from latest attempt (can be null if not attempted)
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
 * @desc     Get user's quiz attempts
 * @route    GET /api/quizzes/user/:userId/attempts
 * @access   Private (Requires user ID match or admin role)
 */
exports.getUserQuizAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // --- Authorization Check ---
    // Ensure user is logged in and either accessing their own attempts or is an admin
    if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access these records.'
      });
    }
    // --- End Authorization Check ---

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
    }
    // Optional: Check if user actually exists
    // const userExists = await User.findById(userId);
    // if (!userExists) return res.status(404).json({ status: 'fail', message: 'User not found' });
    // --- End Validation ---

    // --- Pagination ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Default items per page
    const skip = (page - 1) * limit;
    // --- End Pagination ---

    // --- Querying ---
    // Find attempts for the specified user
    const query = QuizAttempt.find({ user: userId });

    // Sorting (default to most recent first)
    query.sort(req.query.sort || { createdAt: -1 });

    // Populate related data for richer response
    query.populate({
        path: 'quiz', // Populate the 'quiz' field in each attempt
        select: 'title difficulty subject', // Select specific fields from the Quiz model
        populate: { // Nested populate for the subject within the quiz
          path: 'subject',
          select: 'name color' // Select specific fields from the Subject model
        }
      });

    // Apply pagination
    query.skip(skip).limit(limit);

    // Execute query and count total documents matching the filter
    const [attempts, totalAttempts] = await Promise.all([
        query.lean(), // Use lean for performance if no Mongoose methods needed after fetch
        QuizAttempt.countDocuments({ user: userId }) // Count total attempts for pagination info
    ]);
    // --- End Querying ---

    // --- Formatting Response ---
    const formattedAttempts = attempts.map(attempt => ({
      id: attempt._id,
      quizId: attempt.quiz?._id, // Safely access populated data
      quizTitle: attempt.quiz?.title || 'Quiz Deleted', // Handle if quiz was deleted
      subject: attempt.quiz?.subject?.name || 'N/A',
      subjectColor: attempt.quiz?.subject?.color || '#808080', // Default color
      difficulty: attempt.quiz?.difficulty || 'N/A',
      score: attempt.percentageScore, // The percentage score
      passed: attempt.passed,
      timeTaken: attempt.timeTaken, // In seconds (null if not recorded)
      date: attempt.createdAt,      // Timestamp of the attempt
      pointsAwarded: attempt.pointsAwarded || 0 // Points earned from this attempt
    }));
    // --- End Formatting Response ---

    // --- Send JSON Response ---
    res.status(200).json({
      status: 'success',
      results: formattedAttempts.length, // Number of results on the current page
      totalResults: totalAttempts,       // Total number of attempts for the user
      totalPages: Math.ceil(totalAttempts / limit),
      currentPage: page,
      data: {
        attempts: formattedAttempts
      }
    });
    // --- End Send JSON Response ---

  } catch (error) {
    console.error('Error fetching user quiz attempts:', error);
    next(error); // Pass error to the central handler
  }
};
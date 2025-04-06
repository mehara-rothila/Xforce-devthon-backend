// Quiz controller
const mongoose = require('mongoose'); // Required for ObjectId validation
const Quiz = require('../models/quizModel');
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all quizzes with filtering, sorting, pagination, and total count
 * @route   GET /api/quizzes
 * @access  Public
 */
exports.getAllQuizzes = async (req, res, next) => { // Added next
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
exports.getQuizById = async (req, res, next) => { // Added next
  try {
    const quiz = await Quiz.findById(req.params.id).populate({
      path: 'subject',
      select: 'name color icon'
    }); // Consider populating questions and options if needed directly

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
exports.createQuiz = async (req, res, next) => { // Added next
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

    // TODO: Add validation for questions and options structure if needed before creating

    // Create quiz
    const newQuizData = {
      ...req.body,
      createdBy: req.user ? req.user._id : undefined // Get user from auth middleware if available
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
exports.updateQuiz = async (req, res, next) => { // Added next
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
exports.deleteQuiz = async (req, res, next) => { // Added next
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    // Optionally: Delete related attempts or other cleanup
    // await UserQuizAttempt.deleteMany({ quiz: req.params.id });

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
exports.submitQuizAttempt = async (req, res, next) => { // Added next
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: 'fail', message: 'Quiz not found' });
    }

    // Basic validation
    const { answers } = req.body; // answers should be [{ questionId: '...', answerId: '...' }]
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ status: 'fail', message: 'Answers must be provided as an array' });
    }

    // --- Score Calculation Logic ---
    let score = 0;
    let totalPoints = 0; // Use the virtual property or recalculate if needed
    quiz.questions.forEach((question) => {
        const questionPoints = question.points || 1; // Default points if not specified
        totalPoints += questionPoints;
        const userAnswer = answers.find(a => a.questionId === question._id.toString());

        if (userAnswer && userAnswer.answerId) {
            // Check multiple choice using correctAnswer field which should store the correct option's _id
            if (question.correctAnswer && userAnswer.answerId === question.correctAnswer.toString()) {
                score += questionPoints;
            }
            // Add checks for other question types if needed, comparing userAnswer.answerId/value to question.correctAnswer
        }
    });
    // --- End Score Calculation ---

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentageScore >= (quiz.passScore || 0); // Use default passScore from quiz

    // Update quiz attempts count
    quiz.attempts = (quiz.attempts || 0) + 1;
    await quiz.save({ validateBeforeSave: false }); // Skip validation as we only update attempts count

    // TODO: Save the attempt details to a separate UserQuizAttempt collection
    // const attempt = await UserQuizAttempt.create({
    //    user: req.user._id, // Assuming req.user is populated by auth middleware
    //    quiz: quiz._id,
    //    answers: answers, // Store the submitted answers
    //    score: score,
    //    totalPoints: totalPoints,
    //    percentageScore: percentageScore,
    //    passed: passed,
    //    timeTaken: req.body.timeTaken // Optional: Track time taken from frontend
    // });

    res.status(200).json({
      status: 'success',
      message: 'Quiz attempt submitted successfully.', // Added a message
      data: { score, totalPoints, percentageScore, passed }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    // Don't send back raw error messages usually
    res.status(500).json({ status: 'error', message: 'Error processing quiz attempt.' }); // Changed to 500 for server-side errors
    // Use next(error) if you have a robust global error handler that handles responses
  }
};

/**
 * @desc    Get quizzes for a specific subject
 * @route   GET /api/subjects/:id/quizzes (Note: This route might be defined in subjectRoutes.js)
 * @access  Public
 */
exports.getQuizzesForSubject = async (req, res, next) => { // Added next
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
exports.getPracticeQuizzes = async (req, res, next) => { // Added next
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

    // Format quizzes for practice display
    const practiceQuizzes = quizzes.map(quiz => ({
      id: quiz._id,
      title: quiz.title,
      questions: quiz.questions?.length || 0, // Use optional chaining
      difficulty: quiz.difficulty,
      timeEstimate: quiz.timeLimit ? `${quiz.timeLimit} min` : 'N/A',
      // Replace calculateAverageScore with real data if available, e.g., from attempts
      averageScore: calculateAverageScore(quiz), // Using placeholder helper
      attempts: quiz.attempts || 0
    }));

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

// Helper function to calculate average score (Placeholder)
// TODO: Replace this with actual calculation based on saved attempts if needed
function calculateAverageScore(quiz) {
  // In a real app, fetch actual average from attempts data or calculate based on quiz stats
  // This is just a placeholder based on difficulty
  switch (quiz.difficulty) {
    case 'easy': return Math.floor(Math.random() * 15) + 75; // 75-90
    case 'medium': return Math.floor(Math.random() * 20) + 65; // 65-85
    case 'hard': return Math.floor(Math.random() * 20) + 55; // 55-75
    default: return 70;
  }
}
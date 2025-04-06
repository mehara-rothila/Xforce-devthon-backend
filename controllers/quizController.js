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
    // Example: Filter by published status (adjust field name based on your model)
    if (queryObj.isPublished === undefined) { // Default to only published quizzes
        queryObj.isPublished = true;
    } else if (queryObj.isPublished === 'false') {
        queryObj.isPublished = false; // Allow fetching unpublished if explicitly requested
    } else {
        queryObj.isPublished = true;
    }

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
             queryObj._id = null;
        }
    }
    // --- End Subject Filter ---

    // --- Total Count ---
    // Calculate total count matching filters BEFORE pagination
    const totalResults = await Quiz.countDocuments(queryObj);

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
    const limit = parseInt(req.query.limit, 10) || 10; // Use a reasonable default limit
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Populate subject field
    query = query.populate({
      path: 'subject',
      select: 'name color icon' // Select fields you need from Subject
    });

    // Execute query
    const quizzes = await query;

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit);

    // --- Send Response ---
    // Follow the same structure as getAllResources for consistency
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
exports.createQuiz = async (req, res, next) => { // Added next
  try {
    // Basic validation
     if (!req.body.subject || !mongoose.Types.ObjectId.isValid(req.body.subject)) {
         return res.status(400).json({ status: 'fail', message: 'Valid subject ID is required.' });
     }
     if (!req.body.title) {
         return res.status(400).json({ status: 'fail', message: 'Quiz title is required.' });
     }

    // Validate that subject exists
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    // Create quiz
    const newQuiz = await Quiz.create({
      ...req.body,
      createdBy: req.user ? req.user._id : undefined // Get user from auth middleware
    });

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
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    // await QuizAttempt.deleteMany({ quiz: req.params.id });

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
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ status: 'fail', message: 'Answers must be provided as an array' });
    }

    // --- Score Calculation Logic (Keep your existing detailed logic here) ---
    let score = 0;
    let totalPoints = 0;
    quiz.questions.forEach((question, index) => {
        const questionPoints = question.points || 1; // Default points if not specified
        totalPoints += questionPoints;
        const userAnswer = answers.find(a => a.questionId === question._id.toString());
        if (!userAnswer) return;

        // Example: Check multiple choice
        if (question.options && question.options.length > 0) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            if (correctOption && userAnswer.answerId === correctOption._id.toString()) {
                score += questionPoints;
            }
        }
        // Add checks for other question types (true/false, fill-in-the-blank) based on your schema
        // else if (question.isTrueFalse && userAnswer.answer === question.correctAnswer) { score += questionPoints; }
        // else if (question.isFillBlank && userAnswer.answer.toLowerCase() === question.correctAnswer.toLowerCase()) { score += questionPoints; }
    });
    // --- End Score Calculation ---

    const percentageScore = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = percentageScore >= (quiz.passScore || 0);

    // Update quiz attempts count
    quiz.attempts = (quiz.attempts || 0) + 1;
    await quiz.save({ validateBeforeSave: false });

    // TODO: Save the attempt details to a separate UserQuizAttempt collection
    // Example: await UserQuizAttempt.create({ user: req.user._id, quiz: quiz._id, answers, score, percentageScore, passed });

    res.status(200).json({
      status: 'success',
      data: { score, totalPoints, percentageScore, passed }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    // Don't send back raw error messages usually
    res.status(400).json({ status: 'fail', message: 'Error processing quiz attempt.' });
    // Use next(error) if you have a robust global error handler
  }
};

/**
 * @desc    Get quizzes for a subject (Potentially redundant if getAllQuizzes handles subject filter)
 * @route   GET /api/subjects/:id/quizzes
 * @access  Public
 */
exports.getQuizzesForSubject = async (req, res, next) => { // Added next
  try {
    const subjectId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID' });
    }
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    // Add filtering/pagination if needed
    const queryObj = { subject: subjectId /*, isPublished: true */ };
    const totalResults = await Quiz.countDocuments(queryObj);
    const quizzes = await Quiz.find(queryObj).populate('subject', 'name color');

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

    // Apply topic filter if provided
    if (req.query.topic && mongoose.Types.ObjectId.isValid(req.query.topic)) {
      query.topic = req.query.topic; // Assuming 'topic' field exists in Quiz model
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
      // Replace calculateAverageScore with real data if available
      averageScore: calculateAverageScore(quiz),
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
function calculateAverageScore(quiz) {
  // In a real app, fetch actual average from attempts data
  // This is just a placeholder based on difficulty
  switch (quiz.difficulty) {
    case 'easy': return Math.floor(Math.random() * 15) + 75;
    case 'medium': return Math.floor(Math.random() * 20) + 65;
    case 'hard': return Math.floor(Math.random() * 20) + 55;
    default: return 70;
  }
}

// Remember to export all functions used in your routes file
// module.exports = { /* ... include all exported functions ... */ };


// Quiz controller 
const Quiz = require('../models/quizModel');
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all quizzes
 * @route   GET /api/quizzes
 * @access  Public
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    // Build query
    let query = Quiz.find(JSON.parse(queryStr));
    
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const quizzes = await query.populate({
      path: 'subject',
      select: 'name color icon'
    });
    
    res.status(200).json({
      status: 'success',
      results: quizzes.length,
      data: {
        quizzes
      }
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching quizzes'
    });
  }
};

/**
 * @desc    Get quiz by ID
 * @route   GET /api/quizzes/:id
 * @access  Public
 */
exports.getQuizById = async (req, res) => {
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
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching quiz'
    });
  }
};

/**
 * @desc    Create a new quiz
 * @route   POST /api/quizzes
 * @access  Private
 */
exports.createQuiz = async (req, res) => {
  try {
    // Validate that subject exists
    const subject = await Subject.findById(req.body.subject);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // Create quiz
    const newQuiz = await Quiz.create({
      ...req.body,
      createdBy: req.user ? req.user._id : undefined // Will be implemented with auth
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        quiz: newQuiz
      }
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Update a quiz
 * @route   PATCH /api/quizzes/:id
 * @access  Private
 */
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
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
    console.error('Error updating quiz:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Delete a quiz
 * @route   DELETE /api/quizzes/:id
 * @access  Private
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quiz not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting quiz'
    });
  }
};

/**
 * @desc    Submit a quiz attempt
 * @route   POST /api/quizzes/:id/attempts
 * @access  Private
 */
exports.submitQuizAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quiz not found'
      });
    }
    
    // Calculate score
    const { answers } = req.body;
    let score = 0;
    let totalPoints = 0;
    
    // Validate answers format
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Answers must be provided as an array'
      });
    }
    
    // Calculate scores
    quiz.questions.forEach((question, index) => {
      totalPoints += question.points;
      
      // Check if user provided an answer for this question
      const userAnswer = answers.find(a => a.questionId === question._id.toString());
      
      if (!userAnswer) return;
      
      // Check multiple choice questions
      if (question.options && question.options.length > 0) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && userAnswer.answerId === correctOption._id.toString()) {
          score += question.points;
        }
      } 
      // Check true/false questions
      else if (question.isTrueFalse) {
        if (userAnswer.answer === question.correctAnswer) {
          score += question.points;
        }
      }
      // Check fill-in-the-blank questions
      else if (question.isFillBlank) {
        if (userAnswer.answer.toLowerCase() === question.correctAnswer.toLowerCase()) {
          score += question.points;
        }
      }
    });
    
    // Calculate percentage score
    const percentageScore = (score / totalPoints) * 100;
    
    // Determine if passed
    const passed = percentageScore >= quiz.passScore;
    
    // Update quiz attempts count
    quiz.attempts += 1;
    await quiz.save();
    
    // TODO: Save the attempt to user's history (implement when user model is ready)
    
    res.status(200).json({
      status: 'success',
      data: {
        score,
        totalPoints,
        percentageScore,
        passed
      }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Get quizzes for a subject
 * @route   GET /api/subjects/:id/quizzes
 * @access  Public
 */
exports.getQuizzesForSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const quizzes = await Quiz.find({ subject: req.params.id });
    
    res.status(200).json({
      status: 'success',
      results: quizzes.length,
      data: {
        quizzes
      }
    });
  } catch (error) {
    console.error('Error fetching quizzes for subject:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching quizzes'
    });
  }
};
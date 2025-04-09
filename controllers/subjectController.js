const Subject = require('../models/subjectModel');
const Quiz = require('../models/quizModel');

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Public
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true });

    res.status(200).json({
      status: 'success',
      results: subjects.length,
      data: {
        subjects
      }
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching subjects'
    });
  }
};

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Public
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        subject
      }
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching subject'
    });
  }
};

/**
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private/Admin
 */
exports.createSubject = async (req, res) => {
  try {
    const newSubject = await Subject.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        subject: newSubject
      }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Update a subject
 * @route   PATCH /api/subjects/:id
 * @access  Private/Admin
 */
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        subject
      }
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/subjects/:id
 * @access  Private/Admin
 */
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // Instead of deleting, set isActive to false for soft delete
    subject.isActive = false;
    await subject.save();
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting subject'
    });
  }
};

/**
 * @desc    Get all topics for a subject
 * @route   GET /api/subjects/:id/topics
 * @access  Public
 */
exports.getTopics = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      results: subject.topics.length,
      data: {
        topics: subject.topics
      }
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching topics'
    });
  }
};

/**
 * @desc    Add a topic to a subject
 * @route   POST /api/subjects/:id/topics
 * @access  Private/Admin
 */
exports.addTopic = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // Set the order for the new topic
    req.body.order = subject.topics.length + 1;
    
    subject.topics.push(req.body);
    await subject.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        topic: subject.topics[subject.topics.length - 1]
      }
    });
  } catch (error) {
    console.error('Error adding topic:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Update a topic
 * @route   PATCH /api/subjects/:id/topics/:topicId
 * @access  Private/Admin
 */
exports.updateTopic = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const topicIndex = subject.topics.findIndex(
      topic => topic._id.toString() === req.params.topicId
    );
    
    if (topicIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Topic not found'
      });
    }
    
    // Update the topic fields
    Object.keys(req.body).forEach(key => {
      subject.topics[topicIndex][key] = req.body[key];
    });
    
    await subject.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        topic: subject.topics[topicIndex]
      }
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Delete a topic
 * @route   DELETE /api/subjects/:id/topics/:topicId
 * @access  Private/Admin
 */
exports.deleteTopic = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const topicIndex = subject.topics.findIndex(
      topic => topic._id.toString() === req.params.topicId
    );
    
    if (topicIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Topic not found'
      });
    }
    
    subject.topics.splice(topicIndex, 1);
    
    // Reorder remaining topics
    subject.topics.forEach((topic, index) => {
      topic.order = index + 1;
    });
    
    await subject.save();
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting topic'
    });
  }
};

/**
 * @desc    Get user progress for a subject
 * @route   GET /api/subjects/:id/progress
 * @access  Private
 */
exports.getUserProgress = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // In a real app, you'd get the progress from the user model
    // For now, we'll generate mock progress data
    const userProgress = {
      overallProgress: Math.floor(Math.random() * 40) + 30, // Random progress between 30-70%
      topics: subject.topics.map(topic => ({
        id: topic._id,
        name: topic.name,
        progress: Math.floor(Math.random() * 60) + 20, // Random progress between 20-80%
        mastery: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] // Random mastery level
      }))
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        progress: userProgress
      }
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user progress'
    });
  }
};

/**
 * @desc    Get recommended resources for a subject
 * @route   GET /api/subjects/:id/recommendations
 * @access  Private
 */
exports.getRecommendedResources = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // In a real app, you'd retrieve personalized recommendations from a recommendation system
    // For now, we'll generate mock recommendation data
    const recommendedTypes = ['Practice Quiz', 'Study Notes', 'Video Lesson'];
    const difficultyLevels = ['Beginner', 'Medium', 'Advanced'];
    
    const recommendedResources = subject.topics.slice(0, 3).map((topic, index) => ({
      id: index + 1,
      title: `${topic.name} - Comprehensive Guide`,
      type: recommendedTypes[index % recommendedTypes.length],
      difficulty: difficultyLevels[index % difficultyLevels.length],
      estimatedTime: `${Math.floor(Math.random() * 30) + 15} min`,
      description: `Improve your understanding of ${topic.name} with this ${recommendedTypes[index % recommendedTypes.length].toLowerCase()}.`
    }));
    
    res.status(200).json({
      status: 'success',
      results: recommendedResources.length,
      data: {
        recommendations: recommendedResources
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching recommendations'
    });
  }
};
// Subject controller 
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Public
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    
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
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'A subject with this name already exists'
      });
    }
    
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
    const subject = await Subject.findByIdAndDelete(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
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
 * @desc    Get topics for a subject
 * @route   GET /api/subjects/:id/topics
 * @access  Public
 */
exports.getSubjectTopics = async (req, res) => {
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
    console.error('Error fetching subject topics:', error);
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
exports.addTopicToSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    // Add the topic to the subject
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
 * @desc    Update a topic in a subject
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
    
    // Find the topic index
    const topicIndex = subject.topics.findIndex(
      topic => topic._id.toString() === req.params.topicId
    );
    
    if (topicIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Topic not found'
      });
    }
    
    // Update the topic
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
 * @desc    Delete a topic from a subject
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
    
    // Find the topic index
    const topicIndex = subject.topics.findIndex(
      topic => topic._id.toString() === req.params.topicId
    );
    
    if (topicIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Topic not found'
      });
    }
    
    // Remove the topic
    subject.topics.splice(topicIndex, 1);
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
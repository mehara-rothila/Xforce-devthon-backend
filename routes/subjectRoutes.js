const express = require('express');
const router = express.Router();
const Subject = require('../models/subjectModel');
const subjectController = require('../controllers/subjectController');
const quizController = require('../controllers/quizController');

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Public
router.get('/', subjectController.getAllSubjects);

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private/Admin
router.post('/', subjectController.createSubject);

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Public
router.get('/:id', subjectController.getSubjectById);

// @route   PATCH /api/subjects/:id
// @desc    Update a subject
// @access  Private/Admin
router.patch('/:id', subjectController.updateSubject);

// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Private/Admin
router.delete('/:id', subjectController.deleteSubject);

// @route   GET /api/subjects/:id/topics
// @desc    Get topics for a subject
// @access  Public
router.get('/:id/topics', subjectController.getSubjectTopics);

// @route   POST /api/subjects/:id/topics
// @desc    Add a topic to a subject
// @access  Private/Admin
router.post('/:id/topics', subjectController.addTopicToSubject);

// @route   PATCH /api/subjects/:id/topics/:topicId
// @desc    Update a topic in a subject
// @access  Private/Admin
router.patch('/:id/topics/:topicId', subjectController.updateTopic);

// @route   DELETE /api/subjects/:id/topics/:topicId
// @desc    Delete a topic from a subject
// @access  Private/Admin
router.delete('/:id/topics/:topicId', subjectController.deleteTopic);

// @route   GET /api/subjects/:id/quizzes
// @desc    Get quizzes for a subject
// @access  Public
router.get('/:id/quizzes', quizController.getQuizzesForSubject);

// @route   POST /api/subjects/test
// @desc    Create a test subject (for testing database connection)
// @access  Public
router.post('/test', async (req, res) => {
  try {
    const testSubject = await Subject.create({
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
        }
      ]
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        subject: testSubject
      }
    });
  } catch (error) {
    console.error('Error creating test subject:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router;
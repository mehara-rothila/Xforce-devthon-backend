const express = require('express');
const router = express.Router();
const Subject = require('../models/subjectModel');

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Public
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all subjects' });
  // Will be replaced with: subjectController.getAllSubjects
});

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Public
router.get('/:id', (req, res) => {
  res.status(200).json({ message: `Get subject with ID: ${req.params.id}` });
  // Will be replaced with: subjectController.getSubjectById
});

// @route   GET /api/subjects/:id/topics
// @desc    Get topics for a subject
// @access  Public
router.get('/:id/topics', (req, res) => {
  res.status(200).json({ message: `Get topics for subject ID: ${req.params.id}` });
  // Will be replaced with: subjectController.getSubjectTopics
});

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
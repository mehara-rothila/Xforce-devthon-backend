// Subject routes 
const express = require('express');
const router = express.Router();
// const subjectController = require('../controllers/subjectController'); // Uncomment when controller is implemented

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

module.exports = router;
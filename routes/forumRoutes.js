// Forum routes 
const express = require('express');
const router = express.Router();
// const forumController = require('../controllers/forumController'); // Uncomment when controller is implemented

// @route   GET /api/forum/categories
// @desc    Get all forum categories
// @access  Public
router.get('/categories', (req, res) => {
  res.status(200).json({ message: 'Get all forum categories' });
  // Will be replaced with: forumController.getAllCategories
});

// @route   GET /api/forum/topics
// @desc    Get all forum topics with optional filters
// @access  Public
router.get('/topics', (req, res) => {
  res.status(200).json({ message: 'Get all forum topics' });
  // Will be replaced with: forumController.getAllTopics
});

// @route   GET /api/forum/topics/:id
// @desc    Get forum topic by ID
// @access  Public
router.get('/topics/:id', (req, res) => {
  res.status(200).json({ message: `Get forum topic with ID: ${req.params.id}` });
  // Will be replaced with: forumController.getTopicById
});

// @route   POST /api/forum/topics
// @desc    Create a new forum topic
// @access  Private
router.post('/topics', (req, res) => {
  res.status(201).json({ message: 'Create new forum topic' });
  // Will be replaced with: forumController.createTopic
});

module.exports = router;
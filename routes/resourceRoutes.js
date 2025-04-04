// Resource routes 
const express = require('express');
const router = express.Router();
// const resourceController = require('../controllers/resourceController'); // Uncomment when controller is implemented

// @route   GET /api/resources
// @desc    Get all resources with optional filters
// @access  Public
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all resources' });
  // Will be replaced with: resourceController.getAllResources
});

// @route   GET /api/resources/:id
// @desc    Get resource by ID
// @access  Public
router.get('/:id', (req, res) => {
  res.status(200).json({ message: `Get resource with ID: ${req.params.id}` });
  // Will be replaced with: resourceController.getResourceById
});

// @route   GET /api/resources/:id/download
// @desc    Download a resource
// @access  Private
router.get('/:id/download', (req, res) => {
  res.status(200).json({ message: `Download resource with ID: ${req.params.id}` });
  // Will be replaced with: resourceController.downloadResource
});

module.exports = router;
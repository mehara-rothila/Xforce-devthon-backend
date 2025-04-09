const express = require('express');
const resourceController = require('../controllers/resourceController');
const { protect, restrictTo } = require('../middleware/auth'); // Assuming auth middleware is here

const router = express.Router();

// --- Public Routes ---

// GET /api/resources/category-counts - Get counts for sidebar (Place before /:id)
router.get('/category-counts', resourceController.getCategoryCounts);

// GET /api/resources - Get all resources with filters
router.get('/', resourceController.getAllResources);

// GET /api/resources/subject/:subjectId - Get resources for a specific subject
router.get('/subject/:subjectId', resourceController.getResourcesBySubject);

// GET /api/resources/subject/:subjectId/materials - Get formatted study materials
router.get('/subject/:subjectId/materials', resourceController.getStudyMaterials);

// GET /api/resources/:id - Get a single resource by ID (Place after specific paths)
router.get('/:id', resourceController.getResourceById);


// --- Protected Routes (Requires Login) ---

// GET /api/resources/:id/download - Download a resource
// Applying 'protect' middleware to ensure user is logged in
router.get('/:id/download', protect, resourceController.downloadResource);


// --- Admin Routes (Requires Login + Admin Role) ---

// POST /api/resources - Create a new resource
router.post('/', protect, restrictTo('admin'), resourceController.createResource);

// PATCH /api/resources/:id - Update a resource
router.patch('/:id', protect, restrictTo('admin'), resourceController.updateResource);

// DELETE /api/resources/:id - Delete a resource
router.delete('/:id', protect, restrictTo('admin'), resourceController.deleteResource);


module.exports = router;

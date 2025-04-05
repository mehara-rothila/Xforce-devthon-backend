const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.get('/', resourceController.getAllResources);
router.get('/:id', resourceController.getResourceById);
router.get('/subject/:subjectId', resourceController.getResourcesBySubject);
router.get('/subject/:subjectId/materials', resourceController.getStudyMaterials);

// Protected routes
router.get('/:id/download', protect, resourceController.downloadResource);

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', resourceController.createResource);
router.patch('/:id', resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);

module.exports = router;
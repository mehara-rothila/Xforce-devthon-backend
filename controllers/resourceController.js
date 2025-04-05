// Resource controller 
const Resource = require('../models/resourceModel');
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all resources
 * @route   GET /api/resources
 * @access  Public
 */
exports.getAllResources = async (req, res) => {
  try {
    // Build query
    let queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Handle search query
    if (req.query.search) {
      queryObj.title = { $regex: req.query.search, $options: 'i' };
    }
    
    // Convert premium string to boolean if present
    if (queryObj.premium !== undefined) {
      queryObj.premium = queryObj.premium === 'true';
    }
    
    // Build query
    let query = Resource.find(queryObj);
    
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-date');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const resources = await query.populate('subject', 'name');
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      data: {
        resources
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resources'
    });
  }
};

/**
 * @desc    Get resource by ID
 * @route   GET /api/resources/:id
 * @access  Public
 */
exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('subject', 'name');
    
    if (!resource) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        resource
      }
    });
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resource'
    });
  }
};

/**
 * @desc    Create a new resource
 * @route   POST /api/resources
 * @access  Private/Admin
 */
exports.createResource = async (req, res) => {
  try {
    // Check if subject exists
    const subject = await Subject.findById(req.body.subject);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const newResource = await Resource.create({
      ...req.body,
      author: req.user ? req.user.id : undefined
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        resource: newResource
      }
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Update a resource
 * @route   PATCH /api/resources/:id
 * @access  Private/Admin
 */
exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!resource) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        resource
      }
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * @desc    Delete a resource
 * @route   DELETE /api/resources/:id
 * @access  Private/Admin
 */
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
      });
    }
    
    // NOTE: In a production app, you'd also delete the physical file
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting resource'
    });
  }
};

/**
 * @desc    Download a resource
 * @route   GET /api/resources/:id/download
 * @access  Private
 */
exports.downloadResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
      });
    }
    
    // Check if premium resource and user has access
    if (resource.premium) {
      // In a real app, check if the user has premium access
      // For testing, we'll allow it
    }
    
    // Increment download count
    resource.downloads += 1;
    await resource.save();
    
    // In a real app, you'd send the actual file
    // For now, just send a response with download path
    res.status(200).json({
      status: 'success',
      data: {
        downloadUrl: `/download/${resource.filePath}`
      }
    });
  } catch (error) {
    console.error('Error downloading resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while downloading resource'
    });
  }
};

/**
 * @desc    Get study materials for a subject
 * @route   GET /api/resources/subject/:subjectId/materials
 * @access  Public
 */
exports.getStudyMaterials = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const resources = await Resource.find({ 
      subject: req.params.subjectId,
      isActive: true
    }).sort('-date');
    
    // Format resources as study materials
    const studyMaterials = resources.map(resource => ({
      id: resource._id,
      title: resource.title,
      type: resource.type,
      downloadCount: resource.downloads,
      fileSize: resource.size,
      lastUpdated: getTimeAgo(resource.date),
      isPremium: resource.premium
    }));
    
    res.status(200).json({
      status: 'success',
      results: studyMaterials.length,
      data: {
        materials: studyMaterials
      }
    });
  } catch (error) {
    console.error('Error fetching study materials:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching study materials'
    });
  }
};

/**
 * @desc    Get resources by subject
 * @route   GET /api/resources/subject/:subjectId
 * @access  Public
 */
exports.getResourcesBySubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    
    if (!subject) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subject not found'
      });
    }
    
    const resources = await Resource.find({ 
      subject: req.params.subjectId,
      isActive: true 
    }).sort('-date');
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      data: {
        resources
      }
    });
  } catch (error) {
    console.error('Error fetching resources by subject:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resources'
    });
  }
};

// Helper function to format date as time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 604800);
  if (interval >= 1) {
    return interval === 1 ? '1 week ago' : `${interval} weeks ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }
  
  return 'just now';
}
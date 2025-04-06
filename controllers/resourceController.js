const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Resource = require('../models/resourceModel');
const Subject = require('../models/subjectModel');
const Quiz = require('../models/quizModel'); // Assuming quiz model is here

// Helper function
function getTimeAgo(date) {
    if (!date) return 'N/A';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval === 1 ? '1 year ago' : `${interval} years ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval === 1 ? '1 month ago' : `${interval} months ago`;
    interval = Math.floor(seconds / 604800);
    if (interval >= 1) return interval === 1 ? '1 week ago' : `${interval} weeks ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval === 1 ? '1 day ago' : `${interval} days ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    return 'just now';
}


/**
 * @desc    Get all resources with filtering, sorting, pagination, and total count
 * @route   GET /api/resources
 * @access  Public
 */
exports.getAllResources = async (req, res, next) => {
  try {
    // --- Filtering ---
    let queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Filter for active resources by default
    if (queryObj.isActive === undefined) {
        queryObj.isActive = true;
    } else if (queryObj.isActive === 'false') {
        queryObj.isActive = false;
    } else {
         queryObj.isActive = true;
    }

    // Handle text search
    if (req.query.search) {
      queryObj.title = { $regex: req.query.search, $options: 'i' };
    }

    // Handle premium filter
    if (queryObj.premium !== undefined) {
      queryObj.premium = queryObj.premium === 'true';
    }

    // Handle category filter
    if (req.query.category) {
        queryObj.category = req.query.category;
    }

    // --- Handle Subject Filter (Single or Multiple) ---
    if (req.query.subject) {
        const subjectIds = req.query.subject.split(',') // Split by comma
            .map(id => id.trim()) // Remove whitespace
            .filter(id => mongoose.Types.ObjectId.isValid(id)); // Keep only valid ObjectIds

        if (subjectIds.length > 0) {
            // Use $in operator to match any of the valid IDs
            // Ensure the IDs are converted back to ObjectIds for the query
            queryObj.subject = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else {
             console.warn("Subject filter provided but contained no valid ObjectIds:", req.query.subject);
             // If filter is present but invalid, match nothing
             queryObj._id = null;
        }
    }
    // --- End Subject Filter ---

    // --- Total Count ---
    // Calculate total count matching filters BEFORE pagination
    const totalResults = await Resource.countDocuments(queryObj);

    // --- Main Query Execution ---
    let query = Resource.find(queryObj);

    // --- Sorting ---
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-date'); // Default sort
    }

    // --- Field Limiting --- (Optional)
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v'); // Exclude __v by default
    }

    // --- Pagination ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Populate subject field
    query = query.populate('subject', 'name color'); // Populate name and color

    // Execute query
    const resources = await query;

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit);

    // --- Send Response ---
    // IMPORTANT: Send totalResults (total count matching filters)
    // and results (count on the current page)
    res.status(200).json({
      status: 'success',
      totalResults: totalResults, // Total matching documents
      results: resources.length, // Results on current page
      totalPages: totalPages,
      currentPage: page,
      data: {
        resources // Paginated resources
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    next(error); // Pass error to global handler
  }
};

/**
 * @desc    Get counts for each resource category and quizzes
 * @route   GET /api/resources/category-counts
 * @access  Public (or adjust middleware in routes file)
 */
exports.getCategoryCounts = async (req, res, next) => {
  try {
    const subjectMatchFilter = {};
    // Optional: Filter counts by subject(s) if provided in query
    if (req.query.subject) {
        const subjectIds = req.query.subject.split(',')
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id));

        if (subjectIds.length > 0) {
            // Use $in operator for subject matching
            subjectMatchFilter.subject = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else {
            console.warn("Category count subject filter provided but contained no valid ObjectIds:", req.query.subject);
            // If filter is present but invalid, match nothing
            subjectMatchFilter._id = null;
        }
    }

    // --- Count Resources by Category using Aggregation ---
    const resourceCounts = await Resource.aggregate([
      {
        // Match active resources and optionally filter by subject(s)
        $match: {
          isActive: true,
          ...subjectMatchFilter // Add subject filter if present
        }
      },
      {
        // Group by category and sum up the count
        $group: {
          _id: '$category', // Group by the category field
          count: { $sum: 1 } // Count documents in each group
        }
      },
      {
        // Rename _id to category for cleaner output
        $project: {
          _id: 0,
          category: '$_id',
          count: 1
        }
      }
    ]);

    // --- Count Active Quizzes (applying same subject filter) ---
    const quizFilter = {
        // isActive: true, // Or isPublished: true etc. depending on quiz model
         ...subjectMatchFilter // Apply same subject filter
    };
    // Ensure Quiz model is available and countDocuments is appropriate
    const quizCount = await Quiz.countDocuments(quizFilter);

    // --- Format the Response ---
    const finalCounts = {};
    resourceCounts.forEach(item => {
      if (item.category) { // Ensure category is not null/undefined
        finalCounts[item.category] = item.count;
      }
    });
    // Add the quiz count under a specific key matching the frontend category name
    finalCounts['Practice Quizzes'] = quizCount;

    res.status(200).json({
      status: 'success',
      data: {
        counts: finalCounts // Object with category names as keys and counts as values
      }
    });

  } catch (error) {
    console.error('Error fetching category counts:', error);
    next(error); // Pass error to the global error handler
  }
};


/**
 * @desc    Get resource by ID
 * @route   GET /api/resources/:id
 * @access  Public
 */
exports.getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('subject', 'name color');

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resource not found or not active'
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
    next(error);
  }
};

/**
 * @desc    Create a new resource
 * @route   POST /api/resources
 * @access  Private/Admin
 */
exports.createResource = async (req, res, next) => {
  try {
    const requiredFields = ['title', 'category', 'subject', 'type', 'size', 'filePath'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({ status: 'fail', message: `Missing required field: ${field}` });
        }
    }

    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    const newResource = await Resource.create({
      ...req.body,
      author: req.user ? req.user.id : undefined // Get author from protect middleware
    });

    res.status(201).json({
      status: 'success',
      data: {
        resource: newResource
      }
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    next(error);
  }
};

/**
 * @desc    Update a resource
 * @route   PATCH /api/resources/:id
 * @access  Private/Admin
 */
exports.updateResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!resource) {
      return res.status(404).json({ status: 'fail', message: 'Resource not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        resource
      }
    });
  } catch (error) {
    console.error('Error updating resource:', error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    next(error);
  }
};

/**
 * @desc    Delete a resource
 * @route   DELETE /api/resources/:id
 * @access  Private/Admin
 */
exports.deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({ status: 'fail', message: 'Resource not found' });
    }

    // Attempt to delete the associated file
    if (resource.filePath) {
        // Construct the absolute path to the file in the public directory
        const physicalPath = path.join(process.cwd(), 'public', resource.filePath);
        fs.unlink(physicalPath, (err) => {
            if (err && err.code !== 'ENOENT') { // Ignore 'file not found' errors, log others
                console.error(`Error deleting file ${physicalPath}:`, err);
            } else if (!err) {
                console.log(`Successfully deleted file: ${physicalPath}`);
            }
        });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    console.error('Error deleting resource:', error);
    next(error);
  }
};

/**
 * @desc    Download a resource
 * @route   GET /api/resources/:id/download
 * @access  Private (Ensure 'protect' middleware is applied in routes)
 */
exports.downloadResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource || !resource.filePath) {
      return res.status(404).json({ status: 'fail', message: 'Resource or file path not found' });
    }

    // Premium Check (Placeholder)
    if (resource.premium) {
      console.log("Premium resource download attempt.");
      // Add real check: if (!req.user || !req.user.isPremium) return res.status(403).json(...);
    }

    const physicalPath = path.join(process.cwd(), 'public', resource.filePath);
    console.log(`Attempting to download file from: ${physicalPath}`);

    if (!fs.existsSync(physicalPath)) {
        console.error(`File not found on disk: ${physicalPath}`);
        return res.status(404).json({ status: 'fail', message: 'File not found on server.' });
    }

    // Increment Download Count
    resource.downloads = (resource.downloads || 0) + 1;
    await resource.save({ validateBeforeSave: false });

    // Send File
    const filename = path.basename(resource.filePath);
    res.download(physicalPath, filename, (err) => {
        if (err) {
            console.error(`Error sending file ${physicalPath}:`, err);
            // Avoid sending another response if headers were already sent
            if (!res.headersSent) {
                 next(err); // Pass error to handler
            }
        } else {
            console.log(`Successfully sent file: ${filename}`);
        }
    });

  } catch (error) {
    console.error('Error processing download request:', error);
    next(error);
  }
};


/**
 * @desc    Get study materials for a subject
 * @route   GET /api/resources/subject/:subjectId/materials
 * @access  Public
 */
exports.getStudyMaterials = async (req, res, next) => {
  try {
    const subjectId = req.params.subjectId;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID format' });
    }

    const subjectExists = await Subject.findById(subjectId);
    if (!subjectExists) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

    const queryObj = { subject: subjectId, isActive: true };
    const totalResults = await Resource.countDocuments(queryObj);
    // Consider adding pagination here too if the list can grow large
    const resources = await Resource.find(queryObj).sort('-date');

    const studyMaterials = resources.map(resource => ({
      id: resource._id,
      title: resource.title,
      type: resource.type,
      downloadCount: resource.downloads,
      fileSize: resource.size,
      lastUpdated: getTimeAgo(resource.updatedAt || resource.date),
      isPremium: resource.premium
    }));

    res.status(200).json({
      status: 'success',
      totalResults: totalResults,
      results: studyMaterials.length,
      data: { materials: studyMaterials }
    });
  } catch (error) {
    console.error('Error fetching study materials:', error);
    next(error);
  }
};

/**
 * @desc    Get resources by subject
 * @route   GET /api/resources/subject/:subjectId
 * @access  Public
 */
exports.getResourcesBySubject = async (req, res, next) => {
  try {
     const subjectId = req.params.subjectId;
     if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid Subject ID format' });
     }

    const subjectExists = await Subject.findById(subjectId);
    if (!subjectExists) {
      return res.status(404).json({ status: 'fail', message: 'Subject not found' });
    }

     const queryObj = { subject: subjectId, isActive: true };
    const totalResults = await Resource.countDocuments(queryObj);
    // Consider adding pagination here too
    const resources = await Resource.find(queryObj)
        .sort('-date')
        .populate('subject', 'name color');

    res.status(200).json({
      status: 'success',
      totalResults: totalResults,
      results: resources.length,
      data: { resources }
    });
  } catch (error) {
    console.error('Error fetching resources by subject:', error);
    next(error);
  }
};

// Make sure to export all functions used in your routes file
// (You'll need to uncomment and adjust this based on your actual file structure)
/*
 module.exports = {
     getAllResources,
     getResourceById,
     createResource,
     updateResource,
     deleteResource,
     downloadResource,
     getStudyMaterials,
     getResourcesBySubject,
     getCategoryCounts // <-- Make sure the new function is exported
 };
*/


// controllers/userController.js
const User = require('../models/userModel');
const UserProgress = require('../models/userProgressModel');
const Subject = require('../models/subjectModel');
const Achievement = require('../models/achievementModel');
const ForumReply = require('../models/forumReplyModel');
const ForumTopic = require('../models/forumTopicModel'); // Make sure this is required
const Quiz = require('../models/quizModel');
const QuizAttempt = require('../models/quizAttemptModel');
const ResourceAccess = require('../models/resourceAccessModel');
const mongoose = require('mongoose'); // Required for ObjectId check

// --- Helper function to check if an ID is valid ---
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * @desc     Get summary data for the dashboard sidebar for a specific user
 * @route    GET /api/users/:userId/dashboard-summary
 * @access   Private (Should be protected)
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!isValidObjectId(userId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
    }
    console.log(`[Backend] Fetching summary for userId: ${userId}`);

    // 1. Fetch User Data (Full)
    const user = await User.findById(userId).select('name level xp points streak subjects');
    console.log("[Backend] User found:", JSON.stringify(user, null, 2));

    if (!user) {
      console.log("[Backend] User not found, returning 404");
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // 2. Fetch User Progress Data
    const userProgressRecords = await UserProgress.find({ user: userId })
                                          .populate('subject', 'name color') // Populate subject name and color
                                          .lean(); // Use lean for performance
    console.log("[Backend] UserProgress records found:", JSON.stringify(userProgressRecords, null, 2));

    // 3. Calculate Overall Progress per Subject
    const overallProgressPerSubject = userProgressRecords.map(record => {
        let calculatedProgress = 0;
        if (record && record.topicProgress && record.topicProgress.length > 0) {
            const totalProgress = record.topicProgress.reduce((sum, topic) => sum + (topic?.progress || 0), 0);
            calculatedProgress = Math.round(totalProgress / record.topicProgress.length);
        } else if (record) {
            calculatedProgress = record.overallSubjectProgress || 0;
        }
        // Ensure subject exists before accessing properties
        if (!record?.subject) return null; // Skip if subject is somehow null

        return {
            subjectId: record.subject._id.toString(), // Use string IDs for consistency
            name: record.subject.name || 'Unknown Subject',
            color: record.subject.color || '#808080',
            progress: calculatedProgress
        };
    }).filter(sp => sp !== null); // Filter out null entries

    // 4. Calculate Points to Next Level
    const xpForNextLevel = (user.level + 1) * 150; // Example calculation
    const pointsToNextLevel = Math.max(0, xpForNextLevel - user.xp);

    // 5. Get additional stats (ensure helper functions exist and handle errors)
    const quizStats = await getQuizStats(userId);
    const forumStats = await getForumStats(userId);
    const resourceStats = await getResourceStats(userId);
    const studyStats = { // Placeholder
      hours: Math.floor(Math.random() * 100) + 50,
      lastSession: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
    };
    const userRank = await getUserRank(userId);

    // 7. Prepare Response Data Object
    const dashboardSummary = {
        userName: user.name,
        level: user.level,
        xp: user.xp,
        pointsToNextLevel: pointsToNextLevel,
        streak: user.streak,
        points: user.points,
        leaderboardRank: userRank, // Note: Leaderboard display was removed from frontend
        subjectProgress: overallProgressPerSubject,
        quizStats,
        forumStats,
        resourceStats,
        studyStats,
        rank: userRank // Duplicate? leaderboardRank is usually preferred
    };

    // 8. Prepare final payload structure
    const finalPayload = {
        status: 'success',
        data: {
            summary: dashboardSummary
        }
    };

    console.log("[Backend] Sending success response for summary...");
    res.status(200).json(finalPayload);

  } catch (err) {
    console.error("[Backend] Error in getDashboardSummary:", err);
    if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard summary' });
    } else {
        console.error("[Backend] Headers already sent for getDashboardSummary error.");
    }
  }
};

/**
 * @desc     Get detailed topic progress for a specific user and subject
 * @route    GET /api/users/:userId/progress/:subjectId
 * @access   Private (Should be protected)
 */
exports.getDetailedSubjectProgress = async (req, res, next) => {
    try {
        const { userId, subjectId } = req.params;
        if (!isValidObjectId(userId) || !isValidObjectId(subjectId)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid User or Subject ID format' });
        }
        console.log(`[Backend] Fetching detailed progress for user: ${userId}, subject: ${subjectId}`);

        // Find the specific progress document
        const progressDoc = await UserProgress.findOne({ user: userId, subject: subjectId })
                                          .populate({
                                              path: 'subject',
                                              select: 'name color topics', // Select necessary fields from Subject
                                          })
                                          .lean(); // Use lean

        if (!progressDoc || !progressDoc.subject) {
            console.log(`[Backend] No progress or valid subject found for user ${userId}, subject ${subjectId}`);
            return res.status(404).json({ status: 'fail', message: 'Progress data not found for this subject.' });
        }

        console.log(`[Backend] Found progressDoc for subject: ${progressDoc.subject.name}`);

        // Map the topic progress data to include actual topic names
        const detailedTopicProgress = progressDoc.topicProgress.map(tp => {
            const subjectTopic = progressDoc.subject.topics.find(st => st._id.equals(tp.topic));
            return {
                id: subjectTopic ? subjectTopic._id.toString() : tp.topic.toString(),
                name: subjectTopic ? subjectTopic.name : 'Unknown Topic',
                progress: tp.progress || 0,
                mastery: tp.mastery || 'low',
            };
        }).sort((a, b) => {
            // Ensure topics are sorted based on their order in the Subject model
            const topicA = progressDoc.subject.topics.find(st => st._id.toString() === a.id);
            const topicB = progressDoc.subject.topics.find(st => st._id.toString() === b.id);
            return (topicA?.order ?? Infinity) - (topicB?.order ?? Infinity);
        });

        console.log(`[Backend] Mapped detailedTopicProgress:`, JSON.stringify(detailedTopicProgress, null, 2));

        // Prepare the response data structure
        const responseData = {
            subjectId: progressDoc.subject._id.toString(),
            subjectName: progressDoc.subject.name,
            subjectColor: progressDoc.subject.color,
            overallProgress: progressDoc.overallSubjectProgress || 0,
            topics: detailedTopicProgress,
            analytics: { // Placeholder analytics - Replace with real calculations
                timeSpent: "42.5 hrs",
                quizAccuracy: "78.2%",
                weakAreas: detailedTopicProgress.filter(t => t.mastery === 'low').map(t => t.name),
                performanceComparison: { overallStanding: "Top 15%", quizCompletionRate: "78%", consistencyScore: "92%" }
            }
        };

        const finalPayload = {
            status: 'success',
            data: responseData
        };

        console.log("[Backend] Sending detailed progress response...");
        res.status(200).json(finalPayload);

    } catch (err) {
        console.error("[Backend] Error in getDetailedSubjectProgress:", err);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch detailed progress' });
        } else {
             console.error("[Backend] Headers already sent for getDetailedSubjectProgress error.");
        }
    }
};

/**
 * @desc     Get all achievements, indicating which are unlocked by the user
 * @route    GET /api/users/:userId/achievements
 * @access   Private (Should be protected)
 */
exports.getUserAchievements = async (req, res, next) => {
    try {
        const { userId } = req.params;
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        }
        console.log(`[Backend] Fetching achievements for user: ${userId}`);

        // Fetch the user, selecting only the achievements field
        const user = await User.findById(userId).select('achievements').lean();

        if (!user) {
            console.log(`[Backend] User not found for achievements: ${userId}`);
            return res.status(404).json({ status: 'fail', message: 'User not found.' });
        }

        // Create a Set of unlocked achievement IDs (as strings) for quick lookup
        const unlockedAchievementIds = new Set((user.achievements || []).map(id => id.toString()));
        console.log(`[Backend] User has ${unlockedAchievementIds.size} unlocked achievements.`);

        // Fetch ALL defined achievements
        const allAchievements = await Achievement.find({}).lean();
        console.log(`[Backend] Found ${allAchievements.length} total defined achievements.`);

        // Combine the lists: Map all achievements and add unlock status
        const userAchievementsData = allAchievements.map(ach => {
            const isUnlocked = unlockedAchievementIds.has(ach._id.toString());
            return {
                id: ach._id.toString(), // Use string ID for frontend
                title: ach.title,
                description: ach.description,
                icon: ach.icon || 'default-icon-identifier', // Provide default if missing
                category: ach.category,
                xp: ach.xp,
                rarity: ach.rarity,
                unlocked: isUnlocked,
                // If we have unlock date data, add it here (currently placeholder)
                unlockedAt: isUnlocked ? getRandomPastDate(30, 180) : null,
            };
        });

        const finalPayload = {
            status: 'success',
            results: userAchievementsData.length,
            data: {
                achievements: userAchievementsData
            }
        };

        console.log("[Backend] Sending user achievements response...");
        res.status(200).json(finalPayload);

    } catch (err) {
        console.error("[Backend] Error in getUserAchievements:", err);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch user achievements' });
        } else {
             console.error("[Backend] Headers already sent for getUserAchievements error.");
        }
    }
};


/**
 * @desc     Get user's recent activity (Includes Topics, Replies, Quizzes, Resources) - WITH DEBUG LOGS
 * @route    GET /api/users/:userId/activity
 * @access   Private (Should be protected)
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
    }
    console.log(`[Backend Activity DEBUG] Fetching activity for user: ${userId}`);

    // Check if user exists (optional but good practice)
    const userExists = await User.findById(userId).lean();
    if (!userExists) {
        console.log(`[Backend Activity DEBUG] User not found: ${userId}`);
        return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const limit = 5; // Number of items per type to fetch initially

    // --- Fetch different activity types with individual logging ---

    // 1. Quiz Attempts
    let quizAttempts = [];
    try {
        quizAttempts = await QuizAttempt.find({ user: userId }) // Match 'user' field
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate({
            path: 'quiz',
            select: 'title subject',
            populate: { path: 'subject', select: 'name' }
          })
          .lean();
        console.log(`[Backend Activity DEBUG] Raw Quiz Attempts Found: ${quizAttempts.length}`, JSON.stringify(quizAttempts.map(a => a._id))); // Log IDs found
    } catch(e) { console.error('[Backend Activity DEBUG] Error fetching Quiz Attempts:', e); }

    // 2. Forum Replies
    let forumReplies = [];
    try {
        forumReplies = await ForumReply.find({ author: userId }) // Match 'author' field
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate({
            path: 'topic',
            select: 'title category',
            populate: { path: 'category', select: 'name' }
          })
          .lean();
        console.log(`[Backend Activity DEBUG] Raw Forum Replies Found: ${forumReplies.length}`, JSON.stringify(forumReplies.map(r => r._id))); // Log IDs found
    } catch(e) { console.error('[Backend Activity DEBUG] Error fetching Forum Replies:', e); }

    // 3. Forum Topics Created
    let forumTopics = [];
    try {
        forumTopics = await ForumTopic.find({ author: userId }) // Match 'author' field
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate('category', 'name')
          .lean();
        console.log(`[Backend Activity DEBUG] Raw Forum Topics Found: ${forumTopics.length}`, JSON.stringify(forumTopics.map(t => t._id))); // Log IDs found
    } catch(e) { console.error('[Backend Activity DEBUG] Error fetching Forum Topics:', e); }

    // 4. Resource Access Logs
    let resourceAccess = [];
    try {
        resourceAccess = await ResourceAccess.find({ user: userId }) // Match 'user' field
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate({
            path: 'resource',
            select: 'title subject type',
            populate: { path: 'subject', select: 'name' }
          })
          .lean();
        console.log(`[Backend Activity DEBUG] Raw Resource Access Found: ${resourceAccess.length}`, JSON.stringify(resourceAccess.map(a => a._id))); // Log IDs found
    } catch(e) { console.error('[Backend Activity DEBUG] Error fetching Resource Access:', e); }


    // --- Combine and Format Activities ---
    const activities = [
      // Format Quiz Attempts
      ...quizAttempts.map(attempt => {
        const quizTitle = attempt.quiz?.title || 'a quiz';
        const subjectName = attempt.quiz?.subject?.name || 'General';
        return {
            id: attempt._id.toString(),
            type: 'quiz',
            title: `Completed ${quizTitle}`,
            subject: subjectName,
            details: `Score: ${attempt.percentageScore}%`,
            timestamp: attempt.createdAt.toISOString()
        };
      }),

      // Format Forum Replies
      ...forumReplies.map(reply => {
        const topicTitle = reply.topic?.title || 'a discussion';
        const categoryName = reply.topic?.category?.name || 'Forum';
        return {
            id: reply._id.toString(),
            type: 'forum',
            title: `Replied to "${topicTitle}"`,
            subject: categoryName,
            details: 'Forum Reply',
            timestamp: reply.createdAt.toISOString()
        };
      }),

      // Format Forum Topics Created
      ...forumTopics.map(topic => {
        const categoryName = topic.category?.name || 'Forum';
        return {
            id: topic._id.toString(),
            type: 'forum',
            title: `Created topic "${topic.title}"`,
            subject: categoryName,
            details: 'New Topic',
            timestamp: topic.createdAt.toISOString()
        };
      }),

      // Format Resource Access
      ...resourceAccess.map(access => {
        const resourceTitle = access.resource?.title || 'a resource';
        const subjectName = access.resource?.subject?.name || 'General';
        const accessType = access.accessType || 'viewed';
        const resourceType = access.resource?.type || 'Resource';
        return {
            id: access._id.toString(),
            type: 'resource',
            title: `${accessType.charAt(0).toUpperCase() + accessType.slice(1)} ${resourceTitle}`,
            subject: subjectName,
            details: resourceType,
            timestamp: access.createdAt.toISOString()
        };
      })
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by date descending
    .slice(0, 10); // Limit to the latest 10 overall activities

    console.log(`[Backend Activity DEBUG] Sending ${activities.length} combined activities.`);

    res.status(200).json({
      status: 'success',
      results: activities.length,
      data: {
        activities
      }
    });
  } catch (err) {
    console.error('[Backend Activity DEBUG] General Error in getRecentActivity:', err);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch user activity'
      });
    }
  }
};


/**
 * @desc     Get user leaderboard
 * @route    GET /api/users/leaderboard
 * @access   Public
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    // Get top 20 users by points
    const leaderboard = await User.find()
      .select('name points level') // Select fields needed for leaderboard
      .sort({ points: -1 })
      .limit(20)
      .lean(); // Use lean for performance

    // Add rank
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      id: user._id.toString(),
      name: user.name,
      points: user.points,
      level: user.level,
      rank: index + 1
    }));

    res.status(200).json({
      status: 'success',
      results: rankedLeaderboard.length,
      data: {
        leaderboard: rankedLeaderboard
      }
    });
  } catch (err) {
    console.error('[Backend] Error fetching leaderboard:', err);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard'
      });
    }
  }
};

/**
 * @desc     Update user profile (e.g., name, email - not password or role here)
 * @route    PATCH /api/users/:id
 * @access   Private (User can update own profile, Admin can update any)
 */
exports.updateUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        }

        // Ensure the current user can only update their own profile, unless they are an admin
        // Assumes 'protect' middleware adds req.user
        if (!req.user) {
             return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        }
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to update this profile'
            });
        }

        // Fields that CANNOT be updated via this route
        const restrictedFields = ['password', 'role', 'xp', 'level', 'points', 'achievements', 'streak', 'lastActive', 'passwordResetOtp', 'passwordResetExpires'];
        const updateData = { ...req.body };

        // Remove restricted fields from the request body
        restrictedFields.forEach(field => delete updateData[field]);

        // Validate email if provided
        if (updateData.email && !mongoose.Types.ObjectId.isValid(updateData.email)) {
             if (!require('validator').isEmail(updateData.email)) { // Use validator library if available
                 return res.status(400).json({ status: 'fail', message: 'Invalid email format.' });
             }
        }

        // Update user in the database
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true } // Return the updated document and run schema validators
        ).select('-password'); // Exclude password from the returned object

        if (!updatedUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (err) {
        console.error("[Backend] Error updating user profile:", err);
        if (!res.headersSent) {
            // Handle potential duplicate email error
            if (err.code === 11000 && err.keyPattern?.email) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Email address already in use.'
                });
            }
             // Handle validation errors
            if (err.name === 'ValidationError') {
                 const errors = Object.values(err.errors).map(el => el.message);
                 const message = `Invalid input data. ${errors.join('. ')}`;
                 return res.status(400).json({ status: 'fail', message });
            }
            // Generic server error
            res.status(500).json({
                status: 'error',
                message: 'Failed to update user profile'
            });
        }
    }
};

/**
 * @desc     Get user profile details
 * @route    GET /api/users/:id
 * @access   Private (User can get own profile, Admin can get any) - Or Public for basic info
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        }

        // Determine if the request is for the user's own profile or if requester is admin
        // Assumes 'protect' middleware might run optionally or req.user might be undefined
        const isOwnProfileOrAdmin = req.user && (req.user.id === id || req.user.role === 'admin');

        // Select fields based on access level
        // Public view might only get name, level, maybe join date
        // Private view gets more details (excluding sensitive ones)
        const selectFields = isOwnProfileOrAdmin
            ? '-password -passwordResetOtp -passwordResetExpires' // Exclude sensitive fields for own/admin view
            : 'name level createdAt'; // Limited fields for public view

        const user = await User.findById(id).select(selectFields).lean(); // Use lean

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (err) {
        console.error("[Backend] Error fetching user profile:", err);
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch user profile'
            });
        }
    }
};

/**
 * @desc     Get overall user progress across all subjects
 * @route    GET /api/users/:id/progress
 * @access   Private (User can get own progress, Admin can get any)
 */
exports.getUserProgress = async (req, res, next) => {
    try {
        const { id } = req.params; // User ID whose progress is requested
         if (!isValidObjectId(id)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        }

        // Ensure it's the current user requesting their own progress or an admin
        if (!req.user) {
             return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        }
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to access this progress data'
            });
        }

        // Get all progress records for the specified user
        const progressRecords = await UserProgress.find({ user: id })
            .populate('subject', 'name color icon') // Populate necessary subject fields
            .lean(); // Use lean

        // Format the data for the response
        const formattedProgress = progressRecords.map(item => {
            if (!item.subject) return null; // Skip if subject is somehow null
            return {
                subjectId: item.subject._id.toString(),
                name: item.subject.name,
                color: item.subject.color,
                icon: item.subject.icon,
                overallProgress: item.overallSubjectProgress || 0,
                lastUpdated: item.updatedAt.toISOString()
            };
        }).filter(p => p !== null); // Filter out null entries

        res.status(200).json({
            status: 'success',
            results: formattedProgress.length,
            data: {
                progress: formattedProgress
            }
        });
    } catch (err) {
        console.error("[Backend] Error fetching user progress:", err);
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch user progress'
            });
        }
    }
};

// --- Helper Functions --- (Keep these at the end or move to utils)
async function getQuizStats(userId) {
     try {
        const attempts = await QuizAttempt.find({ user: userId }).lean(); // Use lean
        const total = attempts.length;
        if (total === 0) return { completed: 0, passed: 0, failed: 0, avgScore: 0, bestScore: 0 };

        const passed = attempts.filter(a => a.passed).length;
        const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.percentageScore, 0) / total);
        const bestScore = Math.max(...attempts.map(a => a.percentageScore));

        return { completed: total, passed, failed: total - passed, avgScore, bestScore };
    } catch (error) {
        console.error(`Error getting quiz stats for user ${userId}:`, error);
        return { completed: 0, passed: 0, failed: 0, avgScore: 0, bestScore: 0 };
    }
}

async function getForumStats(userId) {
     try {
        const topics = await ForumTopic.countDocuments({ author: userId });
        const replies = await ForumReply.countDocuments({ author: userId });
        const bestAnswers = await ForumReply.countDocuments({ author: userId, isBestAnswer: true });
        return { topics, replies, posts: topics + replies, bestAnswers };
    } catch (error) {
        console.error(`Error getting forum stats for user ${userId}:`, error);
        return { topics: 0, replies: 0, posts: 0, bestAnswers: 0 };
    }
}

async function getResourceStats(userId) {
    try {
        const views = await ResourceAccess.countDocuments({ user: userId, accessType: 'view' });
        const downloads = await ResourceAccess.countDocuments({ user: userId, accessType: 'download' });
        return { accessed: views + downloads, views, downloads };
    } catch (error) {
        console.error(`Error getting resource stats for user ${userId}:`, error);
        return { accessed: 0, views: 0, downloads: 0 };
    }
}

async function getUserRank(userId) {
    try {
        const users = await User.find().select('_id points').sort({ points: -1 }).lean();
        const userIndex = users.findIndex(u => u._id.toString() === userId);

        if (userIndex === -1) return 'N/A';

        const totalUsers = users.length;
        if (totalUsers === 0) return 'N/A';
        const rank = userIndex + 1;
        const percentage = Math.ceil((rank / totalUsers) * 100);

        if (rank === 1 && totalUsers > 1) return 'Top 1%';
        if (rank === 1 && totalUsers === 1) return '#1';

        return `Top ${percentage}%`;
    } catch (error) {
        console.error(`Error getting user rank for user ${userId}:`, error);
        return 'N/A';
    }
}

function getRandomPastDate(minDaysAgo, maxDaysAgo) {
     const now = new Date();
     const daysAgo = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
     const pastDate = new Date(now);
     pastDate.setDate(pastDate.getDate() - daysAgo);
     return pastDate;
}

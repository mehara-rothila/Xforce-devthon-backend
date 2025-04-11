// controllers/userController.js
const User = require('../models/userModel');
const UserProgress = require('../models/userProgressModel');
const Subject = require('../models/subjectModel');
const Achievement = require('../models/achievementModel');
const ForumReply = require('../models/forumReplyModel');
const ForumTopic = require('../models/forumTopicModel');
const Quiz = require('../models/quizModel');
const QuizAttempt = require('../models/quizAttemptModel');
const ResourceAccess = require('../models/resourceAccessModel');
const mongoose = require('mongoose');
const validator = require('validator');

// --- Helper function to check if an ID is valid ---
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id);
};

// --- Helper function to get Quiz Stats (Reads stored aggregates + calculates best score) ---
async function getQuizStats(userId) {
    try {
        console.log(`[getQuizStats] START for user ${userId}`);
        // Fetch user, selecting necessary fields and including virtuals
        const user = await User.findById(userId)
                           .select('quizCompletedCount quizTotalPercentageScoreSum points quizPointsEarned') // Added quizPointsEarned
                           .lean({ virtuals: true }); // IMPORTANT: Include virtuals to get quizAccuracyRate

        console.log(`[getQuizStats] Fetched user data (lean):`, JSON.stringify(user, null, 2));

        if (!user) {
            console.warn(`[getQuizStats] User not found for ID ${userId}`);
            return { completed: 0, avgScore: 0, pointsEarned: 0, totalPoints: 0, passed: 0, failed: 0, bestScore: 0 };
        }

        console.log(`[getQuizStats] Values before return: count=${user.quizCompletedCount}, sum=${user.quizTotalPercentageScoreSum}, virtualAccuracy=${user.quizAccuracyRate}, points=${user.points}, quizPoints=${user.quizPointsEarned}`);

        // --- Calculate Best Score (Optional - requires querying attempts) ---
        let bestScore = 0;
        if (user.quizCompletedCount && user.quizCompletedCount > 0) {
            const bestAttempt = await QuizAttempt.findOne({ user: userId })
                                              .sort({ percentageScore: -1 }) // Sort descending by score
                                              .limit(1) // Get only the top one
                                              .select('percentageScore') // Only need the score field
                                              .lean();
            bestScore = bestAttempt ? bestAttempt.percentageScore : 0;
        }

        const result = {
            completed: user.quizCompletedCount || 0,        // From stored aggregate
            avgScore: user.quizAccuracyRate || 0,           // From virtual property
            pointsEarned: user.quizPointsEarned || 0,       // NEW: Use quiz-specific points
            totalPoints: user.points || 0,                  // Keep overall points for reference
            passed: 0,                                      // Not calculated here to optimize
            failed: 0,                                      // Not calculated here to optimize
            bestScore: bestScore,
        };
        console.log(`[getQuizStats] Calculated Result for ${userId}:`, result);
        return result;
    } catch (error) {
        console.error(`[getQuizStats] Error for user ${userId}:`, error);
        return { completed: 0, avgScore: 0, pointsEarned: 0, totalPoints: 0, passed: 0, failed: 0, bestScore: 0 };
    }
}

// --- Helper: getForumStats ---
async function getForumStats(userId) {
    try {
        // Ensure models are correctly required at the top
        const topics = await ForumTopic.countDocuments({ author: userId });
        const replies = await ForumReply.countDocuments({ author: userId });
        const bestAnswers = await ForumReply.countDocuments({ author: userId, isBestAnswer: true });
        return { topics, replies, posts: topics + replies, bestAnswers };
    } catch (error) {
        console.error(`Error getting forum stats for user ${userId}:`, error);
        return { topics: 0, replies: 0, posts: 0, bestAnswers: 0 };
    }
}

// --- Helper: getResourceStats ---
async function getResourceStats(userId) {
    try {
        // Ensure model is correctly required at the top
        const views = await ResourceAccess.countDocuments({ user: userId, accessType: 'view' });
        const downloads = await ResourceAccess.countDocuments({ user: userId, accessType: 'download' });
        return { accessed: views + downloads, views, downloads };
    } catch (error) {
        console.error(`Error getting resource stats for user ${userId}:`, error);
        return { accessed: 0, views: 0, downloads: 0 };
    }
}

// --- Helper: getUserRank ---
async function getUserRank(userId) {
    try {
        // Find all users, sort by points, get only ID and points
        const users = await User.find().select('_id points').sort({ points: -1 }).lean();
        // Find the index (0-based) of the current user in the sorted list
        const userIndex = users.findIndex(u => u._id.toString() === userId.toString());

        if (userIndex === -1) return 'N/A'; // User not found in ranking

        const totalUsers = users.length;
        if (totalUsers === 0) return 'N/A';

        // Rank is index + 1 (1-based)
        const rank = userIndex + 1;

        // Calculate percentile rank (higher is better, e.g., Top 10%)
        const percentileFromTop = Math.ceil((rank / totalUsers) * 100);

        if (rank === 1 && totalUsers > 1) return 'Top 1%'; // Special case for #1
        if (rank === 1 && totalUsers === 1) return '#1';

        return `Top ${percentileFromTop}%`;
    } catch (error) {
        console.error(`Error getting user rank for user ${userId}:`, error);
        return 'N/A';
    }
}

// --- Helper: getRandomPastDate ---
function getRandomPastDate(minDaysAgo, maxDaysAgo) {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - daysAgo);
    return pastDate;
}

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
        console.log(`[getDashboardSummary] START Fetching summary for userId: ${userId}`);

        // 1. Fetch Core User Data
        const user = await User.findById(userId).select('name level xp points quizPointsEarned streak subjects').lean();

        if (!user) {
            console.log("[getDashboardSummary] User not found, returning 404");
            return res.status(404).json({ status: 'fail', message: 'User not found' });
        }

        // 2. Fetch User Progress Data
        const userProgressRecords = await UserProgress.find({ user: userId }).populate('subject', 'name color').lean();
        const overallProgressPerSubject = userProgressRecords.map(record => {
            if (!record?.subject) return null;
            let calculatedProgress = record.overallSubjectProgress || 0;
            if (record.topicProgress && record.topicProgress.length > 0) {
                const totalProgress = record.topicProgress.reduce((sum, topic) => sum + (topic?.progress || 0), 0);
                if (record.topicProgress.length > 0) calculatedProgress = Math.round(totalProgress / record.topicProgress.length);
            }
            return { subjectId: record.subject._id.toString(), name: record.subject.name, color: record.subject.color || '#808080', progress: calculatedProgress };
        }).filter(sp => sp !== null);

        // 3. Calculate Points to Next Level
        const xpForNextLevel = (user.level + 1) * 150;
        const pointsToNextLevel = Math.max(0, xpForNextLevel - user.xp);

        // 4. Get additional stats using helper functions
        console.log(`[getDashboardSummary] Calling getQuizStats for ${userId}`);
        const quizStats = await getQuizStats(userId);
        console.log(`[getDashboardSummary] Received quizStats:`, quizStats);

        const forumStats = await getForumStats(userId);
        const resourceStats = await getResourceStats(userId);
        const studyStats = {
            hours: Math.floor(Math.random() * 100) + 50,
            lastSession: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
        };
        const userRank = await getUserRank(userId);

        // 5. Prepare Response Data Object
        const dashboardSummary = {
            userName: user.name,
            level: user.level,
            xp: user.xp,
            pointsToNextLevel: pointsToNextLevel,
            streak: user.streak,
            points: user.points,                         // Overall points from user doc
            quizPointsEarned: user.quizPointsEarned || 0, // NEW: Specific quiz points field
            leaderboardRank: userRank,
            subjectProgress: overallProgressPerSubject,
            quizStats: {
                completed: quizStats.completed,
                avgScore: quizStats.avgScore,
                bestScore: quizStats.bestScore,
                pointsEarned: quizStats.pointsEarned       // NEW: Include quiz-specific points in quiz stats
            },
            forumStats,
            resourceStats,
            studyStats,
            rank: userRank
        };

        // 6. Send Response
        console.log("[getDashboardSummary] Sending final summary response...");
        res.status(200).json({ status: 'success', data: { summary: dashboardSummary } });
    } catch (err) {
        console.error("[getDashboardSummary] Error:", err);
        if (!res.headersSent) next(err);
        else console.error("[getDashboardSummary] Headers already sent, could not forward error.");
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
        const progressDoc = await UserProgress.findOne({ user: userId, subject: subjectId })
                                          .populate({ path: 'subject', select: 'name color topics' })
                                          .lean();
        if (!progressDoc || !progressDoc.subject) {
            return res.status(404).json({ status: 'fail', message: 'Progress data not found for this subject.' });
        }
        const detailedTopicProgress = progressDoc.topicProgress.map(tp => {
            const subjectTopic = progressDoc.subject.topics.find(st => st._id.equals(tp.topic));
            return { id: subjectTopic ? subjectTopic._id.toString() : tp.topic.toString(), name: subjectTopic ? subjectTopic.name : 'Unknown Topic', progress: tp.progress || 0, mastery: tp.mastery || 'low' };
        }).sort((a, b) => {
            const topicA = progressDoc.subject.topics.find(st => st._id.toString() === a.id);
            const topicB = progressDoc.subject.topics.find(st => st._id.toString() === b.id);
            return (topicA?.order ?? Infinity) - (topicB?.order ?? Infinity);
        });
        
        // Placeholder analytics - replace with real calculations if needed
        const analytics = {
            timeSpent: "N/A",
            quizAccuracy: "N/A", // Could calculate this based on attempts for quizzes linked to this subject/topics
            weakAreas: detailedTopicProgress.filter(t => t.mastery === 'low').map(t => t.name),
            performanceComparison: { overallStanding: "N/A", quizCompletionRate: "N/A", consistencyScore: "N/A" }
        };
        
        const responseData = {
            subjectId: progressDoc.subject._id.toString(),
            subjectName: progressDoc.subject.name,
            subjectColor: progressDoc.subject.color,
            overallProgress: progressDoc.overallSubjectProgress || 0,
            topics: detailedTopicProgress,
            analytics: analytics
        };
        
        res.status(200).json({ status: 'success', data: responseData });
    } catch (err) { 
        console.error("[Backend] Error in getDetailedSubjectProgress:", err); 
        next(err); 
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
        if (!isValidObjectId(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        const user = await User.findById(userId).select('achievements').lean();
        if (!user) return res.status(404).json({ status: 'fail', message: 'User not found.' });
        const unlockedAchievementIds = new Set((user.achievements || []).map(id => id.toString()));
        const allAchievements = await Achievement.find({}).lean();
        const userAchievementsData = allAchievements.map(ach => {
            const isUnlocked = unlockedAchievementIds.has(ach._id.toString());
            return { id: ach._id.toString(), title: ach.title, description: ach.description, icon: ach.icon || 'default-icon', category: ach.category, xp: ach.xp, rarity: ach.rarity, unlocked: isUnlocked, unlockedAt: isUnlocked ? getRandomPastDate(30, 180) : null };
        });
        res.status(200).json({ status: 'success', results: userAchievementsData.length, data: { achievements: userAchievementsData } });
    } catch (err) { 
        console.error("[Backend] Error in getUserAchievements:", err); 
        next(err); 
    }
};

/**
 * @desc     Get user's recent activity
 * @route    GET /api/users/:userId/activity
 * @access   Private (Should be protected)
 */
exports.getRecentActivity = async (req, res, next) => {
    try {
        const { userId } = req.params;
        if (!isValidObjectId(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        const userExists = await User.findById(userId).lean();
        if (!userExists) return res.status(404).json({ status: 'fail', message: 'User not found' });
        const limit = 10; // Fetch more items initially to get a mix
        
        // Fetch activities concurrently
        const [quizAttempts, forumReplies, forumTopics, resourceAccess] = await Promise.all([
            QuizAttempt.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'quiz', select: 'title subject', populate: { path: 'subject', select: 'name' } }).lean(),
            ForumReply.find({ author: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'topic', select: 'title category', populate: { path: 'category', select: 'name' } }).lean(),
            ForumTopic.find({ author: userId }).sort({ createdAt: -1 }).limit(limit).populate('category', 'name').lean(),
            ResourceAccess.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'resource', select: 'title subject type', populate: { path: 'subject', select: 'name' } }).lean()
        ]);
        
        // Format and combine activities
        const activities = [
            ...quizAttempts.map(a => ({ id: a._id.toString(), type: 'quiz', title: `Completed ${a.quiz?.title || 'a quiz'}`, subject: a.quiz?.subject?.name || 'General', details: `Score: ${a.percentageScore}%`, timestamp: a.createdAt.toISOString() })),
            ...forumReplies.map(r => ({ id: r._id.toString(), type: 'forum', title: `Replied to "${r.topic?.title || 'a discussion'}"`, subject: r.topic?.category?.name || 'Forum', details: 'Forum Reply', timestamp: r.createdAt.toISOString() })),
            ...forumTopics.map(t => ({ id: t._id.toString(), type: 'forum', title: `Created topic "${t.title}"`, subject: t.category?.name || 'Forum', details: 'New Topic', timestamp: t.createdAt.toISOString() })),
            ...resourceAccess.map(acc => ({ id: acc._id.toString(), type: 'resource', title: `${(acc.accessType || 'viewed').replace(/^\w/, c => c.toUpperCase())} ${acc.resource?.title || 'a resource'}`, subject: acc.resource?.subject?.name || 'General', details: acc.resource?.type || 'Resource', timestamp: acc.createdAt.toISOString() }))
        ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort combined list
        .slice(0, 10); // Limit overall total shown
        
        res.status(200).json({ status: 'success', results: activities.length, data: { activities } });
    } catch (err) { 
        console.error('[Backend Activity] Error in getRecentActivity:', err); 
        next(err); 
    }
};

/**
 * @desc     Get user leaderboard
 * @route    GET /api/users/leaderboard
 * @access   Public
 */
exports.getLeaderboard = async (req, res, next) => {
    try {
        // Correctly parse limit from query or default to 20
        const limit = parseInt(req.query.limit, 10) || 20;
        if (isNaN(limit) || limit <= 0) { // Add validation for limit
            return res.status(400).json({ status: 'fail', message: 'Invalid limit parameter.' });
        }

        const leaderboard = await User.find().select('name points level').sort({ points: -1 }).limit(limit).lean();
        const rankedLeaderboard = leaderboard.map((user, index) => ({ id: user._id.toString(), name: user.name, points: user.points, level: user.level, rank: index + 1 }));
        res.status(200).json({ status: 'success', results: rankedLeaderboard.length, data: { leaderboard: rankedLeaderboard } });
    } catch (err) { 
        console.error('[Backend] Error fetching leaderboard:', err); 
        next(err); 
    }
};

/**
 * @desc     Update user profile
 * @route    PATCH /api/users/:id
 * @access   Private
 */
exports.updateUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        // Authentication & Authorization Check
        if (!req.user) return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ status: 'fail', message: 'You do not have permission to update this profile' });

        // Fields that should NOT be updatable via this general profile route
        const restrictedFields = [
            'password', 'role', 'xp', 'level', 'points', 'achievements', 'streak',
            'lastActive', 'passwordResetOtp', 'passwordResetExpires',
            'quizCompletedCount', 'quizTotalPercentageScoreSum', 'quizPointsEarned' // Protect aggregate fields too
        ];
        const updateData = { ...req.body };
        restrictedFields.forEach(field => delete updateData[field]); // Remove restricted fields

        // Email validation
        if (updateData.email && !validator.isEmail(updateData.email)) {
             return res.status(400).json({ status: 'fail', message: 'Invalid email format.' });
        }

        // Perform the update
        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
                                     .select('-password -passwordResetOtp -passwordResetExpires'); // Exclude sensitive fields from response

        if (!updatedUser) return res.status(404).json({ status: 'fail', message: 'User not found' });

        res.status(200).json({ status: 'success', data: { user: updatedUser } });
    } catch (err) {
        console.error("[Backend] Error updating user profile:", err);
        // Specific error for duplicate email
        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(400).json({ status: 'fail', message: 'Email address already in use.' });
        }
        // Mongoose validation errors
        if (err.name === 'ValidationError') {
             const errors = Object.values(err.errors).map(el => el.message);
             return res.status(400).json({ status: 'fail', message: `Invalid input data. ${errors.join('. ')}` });
        }
        // Pass other errors to the general handler
        next(err);
    }
};

/**
 * @desc     Get user profile details
 * @route    GET /api/users/:id
 * @access   Private/Public
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });

        // Determine if the request needs private data (self or admin)
        const isOwnProfileOrAdmin = req.user && (req.user.id === id || req.user.role === 'admin');

        // Define fields to select based on access level
        let selectFields = 'name level createdAt'; // Default public fields
        if (isOwnProfileOrAdmin) {
            // Add fields needed for private view, including aggregates, exclude sensitive ones
            selectFields = '-password -passwordResetOtp -passwordResetExpires quizCompletedCount quizTotalPercentageScoreSum quizPointsEarned';
        }

        // Fetch user, include virtuals only for private view
        const user = await User.findById(id)
                                .select(selectFields)
                                .lean({ virtuals: isOwnProfileOrAdmin });

        if (!user) return res.status(404).json({ status: 'fail', message: 'User not found' });

        res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
        console.error("[Backend] Error fetching user profile:", err);
        next(err); // Pass error to handler
    }
};

/**
 * @desc     Get overall user progress across all subjects
 * @route    GET /api/users/:id/progress
 * @access   Private
 */
exports.getUserProgress = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        // Authorization check
        if (!req.user) return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this progress data' });

        const progressRecords = await UserProgress.find({ user: id })
            .populate('subject', 'name color icon').lean(); // Populate necessary subject fields

        const formattedProgress = progressRecords.map(item => {
            if (!item.subject) return null; // Skip if subject population failed
            return {
                subjectId: item.subject._id.toString(),
                name: item.subject.name,
                color: item.subject.color,
                icon: item.subject.icon,
                overallProgress: item.overallSubjectProgress || 0,
                lastUpdated: item.updatedAt.toISOString() // Assuming timestamps:true in UserProgress schema
            };
        }).filter(p => p !== null); // Filter out any null entries

        res.status(200).json({ status: 'success', results: formattedProgress.length, data: { progress: formattedProgress } });
    } catch (err) {
        console.error("[Backend] Error fetching user progress:", err);
        next(err); // Pass error to handler
    }
};
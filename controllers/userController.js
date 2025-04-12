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
const DailyActivityLog = require('../models/dailyActivityLogModel'); // *** ADD THIS ***
const mongoose = require('mongoose');
const validator = require('validator');
const { startOfMonth, endOfMonth, format } = require('date-fns'); // *** ADD date-fns ***

// --- Helper function to check if an ID is valid ---
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Calculate XP needed for a specific level using the same formula that determines level from XP
 * @param {number} level - The level to calculate XP for
 * @returns {number} - The XP needed to reach this level
 */
function calculateXpForLevel(level) {
    const effectiveLevel = Math.max(1, level);
    return 100 * Math.pow(effectiveLevel - 1, 2);
}


// --- Helper: Calculate Achievement Points ---
async function calculateAchievementPoints(userId) {
    try {
        const user = await User.findById(userId).select('achievements').lean();
        if (!user || !user.achievements || !user.achievements.length) { return 0; }
        const unlockedAchievements = await Achievement.find({ _id: { $in: user.achievements } }).select('points').lean();
        const totalPoints = unlockedAchievements.reduce((sum, ach) => sum + (typeof ach.points === 'number' ? ach.points : 0), 0);
        return totalPoints;
    } catch (error) {
        console.error(`Error calculating achievement points for user ${userId}:`, error);
        return 0;
    }
}

// --- Helper: Calculate Achievement Progress (Example Placeholder) ---
async function calculateAchievementProgress(userId, achievement) {
  try {
    switch (achievement.trigger) {
      case 'quiz_perfect_score':
        return await QuizAttempt.countDocuments({ user: userId, percentageScore: 100 });
      case 'quiz_completion':
        let query = { user: userId };
        if (achievement.condition?.passed) query.passed = true;
        if (achievement.condition?.minScore) query.percentageScore = { $gte: achievement.condition.minScore };
        return await QuizAttempt.countDocuments(query);
      case 'quiz_points':
        const userPoints = await User.findById(userId).select('quizPointsEarned').lean();
        return userPoints?.quizPointsEarned || 0;
      case 'forum_posts':
        return await ForumTopic.countDocuments({ author: userId });
      case 'forum_replies':
        return await ForumReply.countDocuments({ author: userId });
      case 'forum_best_answers':
        return await ForumReply.countDocuments({ author: userId, isBestAnswer: true });
      case 'resource_access':
        const resourceQuery = { user: userId };
        if (achievement.condition?.accessType) resourceQuery.accessType = achievement.condition.accessType;
        return await ResourceAccess.countDocuments(resourceQuery);
      case 'study_streak':
        const streakUser = await User.findById(userId).select('streak').lean();
        return streakUser?.streak || 0;
      default:
        console.warn(`Progress calculation not implemented for trigger: ${achievement.trigger}`);
        return 0;
    }
  } catch (error) {
    console.error(`Error calculating achievement progress for ${achievement.title}:`, error);
    return 0;
  }
}


// --- Helper function to get Quiz Stats ---
async function getQuizStats(userId) {
    try {
        const user = await User.findById(userId).select('quizCompletedCount quizTotalPercentageScoreSum points quizPointsEarned').lean();
        if (!user) { return { completed: 0, avgScore: 0, pointsEarned: 0, totalPoints: 0, passed: 0, failed: 0, bestScore: 0 }; }
        const count = user.quizCompletedCount || 0;
        const sum = user.quizTotalPercentageScoreSum || 0;
        let calculatedAvgScore = (count > 0) ? Math.round(Math.max(0, sum / count)) : 0;
        let bestScore = 0;
        if (count > 0) {
            const bestAttempt = await QuizAttempt.findOne({ user: userId }).sort({ percentageScore: -1 }).limit(1).select('percentageScore').lean();
            bestScore = bestAttempt?.percentageScore || 0;
        }
        return { completed: count, avgScore: calculatedAvgScore, pointsEarned: user.quizPointsEarned || 0, totalPoints: user.points || 0, passed: 0, failed: 0, bestScore: bestScore };
    } catch (error) {
        console.error(`[getQuizStats] Error for user ${userId}:`, error);
        return { completed: 0, avgScore: 0, pointsEarned: 0, totalPoints: 0, passed: 0, failed: 0, bestScore: 0 };
    }
}

// --- Helper: getForumStats ---
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

// --- Helper: getResourceStats ---
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

// --- Helper: getUserRank ---
async function getUserRank(userId) {
    try {
        const users = await User.find().select('_id points').sort({ points: -1 }).lean();
        const userIndex = users.findIndex(u => u._id.toString() === userId.toString());
        if (userIndex === -1) return 'N/A';
        const totalUsers = users.length;
        if (totalUsers === 0) return 'N/A';
        const rank = userIndex + 1;
        const percentileFromTop = Math.ceil((rank / totalUsers) * 100);
        if (rank === 1 && totalUsers > 1) return 'Top 1%';
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
        if (!isValidObjectId(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this summary' });
        const user = await User.findById(userId).select('name level xp points quizPointsEarned streak subjects achievements').lean();
        if (!user) return res.status(404).json({ status: 'fail', message: 'User not found' });
        const userProgressRecords = await UserProgress.find({ user: userId }).populate('subject', 'name color').lean();
        const overallProgressPerSubject = userProgressRecords.map(record => {
            if (!record?.subject) return null;
            let calculatedProgress = record.overallSubjectProgress || 0;
            if (record.topicProgress?.length > 0) {
                const totalProgress = record.topicProgress.reduce((sum, topic) => sum + (topic?.progress || 0), 0);
                calculatedProgress = Math.round(totalProgress / record.topicProgress.length);
            }
            return { subjectId: record.subject._id.toString(), name: record.subject.name, color: record.subject.color || '#808080', progress: calculatedProgress };
        }).filter(sp => sp !== null);
        const currentLevel = user.level || 1;
        const currentXP = user.xp || 0;
        const xpForCurrentLevel = calculateXpForLevel(currentLevel);
        const xpForNextLevel = calculateXpForLevel(currentLevel + 1);
        const pointsToNextLevel = Math.max(0, xpForNextLevel - currentXP);
        let levelProgress = 0;
        const xpInLevel = xpForNextLevel - xpForCurrentLevel;
        if (xpInLevel > 0) { levelProgress = Math.min(100, Math.max(0, ((currentXP - xpForCurrentLevel) / xpInLevel) * 100)); }
        else if (currentXP >= xpForCurrentLevel) { levelProgress = 100; }
        const quizStats = await getQuizStats(userId);
        const forumStats = await getForumStats(userId);
        const resourceStats = await getResourceStats(userId);
        const userAchievementPoints = await calculateAchievementPoints(userId);
        const studyStats = { hours: Math.floor(Math.random() * 100) + 50, lastSession: getRandomPastDate(1, 7) }; // Mock study stats
        const userRank = await getUserRank(userId);
        const dashboardSummary = {
            userName: user.name, level: currentLevel, xp: currentXP, pointsToNextLevel: pointsToNextLevel,
            xpForNextLevel: xpForNextLevel, levelProgress: levelProgress, streak: user.streak || 0,
            points: user.points || 0, quizPointsEarned: user.quizPointsEarned || 0,
            achievementPoints: userAchievementPoints, leaderboardRank: userRank,
            subjectProgress: overallProgressPerSubject,
            quizStats: { completed: quizStats.completed, avgScore: quizStats.avgScore, bestScore: quizStats.bestScore, pointsEarned: quizStats.pointsEarned },
            forumStats, resourceStats, studyStats, rank: userRank
        };
        res.status(200).json({ status: 'success', data: { summary: dashboardSummary } });
    } catch (err) {
        console.error("[getDashboardSummary] Error:", err);
        if (!res.headersSent) next(err);
        else console.error("[getDashboardSummary] Headers already sent.");
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
        if (!isValidObjectId(userId) || !isValidObjectId(subjectId)) return res.status(400).json({ status: 'fail', message: 'Invalid User or Subject ID format' });
        if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this progress data' });
        const progressDoc = await UserProgress.findOne({ user: userId, subject: subjectId }).populate({ path: 'subject', select: 'name color topics' }).lean();
        if (!progressDoc?.subject) return res.status(404).json({ status: 'fail', message: 'Progress data not found for this subject.' });
        const detailedTopicProgress = progressDoc.subject.topics.map(subjectTopic => {
             const topicProgressEntry = progressDoc.topicProgress.find(tp => tp.topic.equals(subjectTopic._id));
             return { id: subjectTopic._id.toString(), name: subjectTopic.name, progress: topicProgressEntry?.progress || 0, mastery: topicProgressEntry?.mastery || 'low' };
         }).sort((a, b) => {
             const topicA = progressDoc.subject.topics.find(st => st._id.toString() === a.id);
             const topicB = progressDoc.subject.topics.find(st => st._id.toString() === b.id);
             return (topicA?.order ?? Infinity) - (topicB?.order ?? Infinity);
         });
        const analytics = { timeSpent: "N/A", quizAccuracy: "N/A", weakAreas: detailedTopicProgress.filter(t => t.mastery === 'low').map(t => t.name), performanceComparison: { overallStanding: "N/A", quizCompletionRate: "N/A", consistencyScore: "N/A" } };
        const responseData = { subjectId: progressDoc.subject._id.toString(), subjectName: progressDoc.subject.name, subjectColor: progressDoc.subject.color, overallProgress: progressDoc.overallSubjectProgress || 0, topics: detailedTopicProgress, analytics: analytics };
        res.status(200).json({ status: 'success', data: responseData });
    } catch (err) {
        console.error("[Backend] Error in getDetailedSubjectProgress:", err);
        next(err);
    }
};

/**
 * @desc     Get user achievements with unlock status, total points, and total XP
 * @route    GET /api/users/:userId/achievements
 * @access   Private
 */
exports.getUserAchievements = async (req, res, next) => {
    try {
        const { userId } = req.params;
        if (!isValidObjectId(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) return res.status(403).json({ status: 'fail', message: 'You do not have permission to access these achievements' });
        const achievements = await Achievement.find().lean();
        const user = await User.findById(userId).select('achievements xp').lean(); // Fetch 'xp'
        if (!user) return res.status(404).json({ status: 'fail', message: 'User not found.' });
        // console.log(`[userController.getUserAchievements] Fetched user ${userId}, XP: ${user.xp}`); // Debug Log 1
        const unlockedAchievementIds = new Set((user.achievements || []).map(id => id.toString()));
        const totalAchievementPoints = await calculateAchievementPoints(userId);
        const achievementsWithStatus = await Promise.all(
          achievements.map(async (achievement) => {
            const isUnlocked = unlockedAchievementIds.has(achievement._id.toString());
            let progressValue = 0;
            let totalNeeded = achievement.requirement || 1;
            if (!isUnlocked) { progressValue = await calculateAchievementProgress(userId, achievement); }
            const dateUnlocked = isUnlocked ? getRandomPastDate(30, 180).toISOString().split('T')[0] : null;
            return {
              id: achievement._id.toString(), title: achievement.title, description: achievement.description,
              icon: achievement.icon, category: achievement.category, unlocked: isUnlocked,
              progress: isUnlocked ? 100 : Math.min(100, Math.round((progressValue / totalNeeded) * 100)),
              totalNeeded, xp: achievement.xp || 0, points: achievement.points || 0,
              rarity: achievement.rarity, unlockedAt: dateUnlocked
            };
          })
        );
        const responseData = {
            achievements: achievementsWithStatus,
            totalAchievementPoints: totalAchievementPoints,
            totalUserXp: user.xp || 0 // User's TOTAL XP
        };
        // console.log(`[userController.getUserAchievements] Sending response for user ${userId}:`, JSON.stringify(responseData)); // Debug Log 2
        res.status(200).json({ status: 'success', results: achievementsWithStatus.length, data: responseData });
    } catch (err) {
        console.error("[userController.getUserAchievements] Error:", err);
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
        if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this activity' });
        const userExists = await User.findById(userId).lean();
        if (!userExists) return res.status(404).json({ status: 'fail', message: 'User not found' });
        const limit = 15;
        const [quizAttempts, forumReplies, forumTopics, resourceAccess] = await Promise.all([
            QuizAttempt.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'quiz', select: 'title subject', populate: { path: 'subject', select: 'name' } }).lean(),
            ForumReply.find({ author: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'topic', select: 'title category', populate: { path: 'category', select: 'name' } }).lean(),
            ForumTopic.find({ author: userId }).sort({ createdAt: -1 }).limit(limit).populate('category', 'name').lean(),
            ResourceAccess.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'resource', select: 'title subject type', populate: { path: 'subject', select: 'name' } }).lean()
        ]);
        const activities = [
            ...quizAttempts.map(a => ({ id: a._id.toString(), type: 'quiz', title: `Completed ${a.quiz?.title || 'a quiz'}`, subject: a.quiz?.subject?.name || 'General', details: `Score: ${a.percentageScore}%`, timestamp: a.createdAt.toISOString() })),
            ...forumReplies.map(r => ({ id: r._id.toString(), type: 'forum', title: `Replied to "${r.topic?.title || 'a discussion'}"`, subject: r.topic?.category?.name || 'Forum', details: 'Forum Reply', timestamp: r.createdAt.toISOString() })),
            ...forumTopics.map(t => ({ id: t._id.toString(), type: 'forum', title: `Created topic "${t.title}"`, subject: t.category?.name || 'Forum', details: 'New Topic', timestamp: t.createdAt.toISOString() })),
            ...resourceAccess.map(acc => ({ id: acc._id.toString(), type: 'resource', title: `${(acc.accessType || 'viewed').replace(/^\w/, c => c.toUpperCase())} ${acc.resource?.title || 'a resource'}`, subject: acc.resource?.subject?.name || 'General', details: acc.resource?.type || 'Resource', timestamp: acc.createdAt.toISOString() }))
        ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
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
        const limit = parseInt(req.query.limit, 10) || 20;
        if (isNaN(limit) || limit <= 0 || limit > 100) return res.status(400).json({ status: 'fail', message: 'Invalid or excessive limit parameter.' });
        const leaderboard = await User.find().select('name points level').sort({ points: -1, level: -1, xp: -1 }).limit(limit).lean();
        const rankedLeaderboard = leaderboard.map((user, index) => ({ id: user._id.toString(), name: user.name, points: user.points || 0, level: user.level || 1, rank: index + 1 }));
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
        if (!req.user) return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ status: 'fail', message: 'You do not have permission to update this profile' });
        const restrictedFields = [ 'password', 'role', 'xp', 'level', 'points', 'achievements', 'streak', 'lastActive', 'passwordResetOtp', 'passwordResetExpires', 'quizCompletedCount', 'quizTotalPercentageScoreSum', 'quizPointsEarned' ];
        const updateData = { ...req.body };
        restrictedFields.forEach(field => delete updateData[field]);
        if (updateData.email && !validator.isEmail(updateData.email)) return res.status(400).json({ status: 'fail', message: 'Invalid email format.' });
        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password -passwordResetOtp -passwordResetExpires');
        if (!updatedUser) return res.status(404).json({ status: 'fail', message: 'User not found' });
        res.status(200).json({ status: 'success', data: { user: updatedUser } });
    } catch (err) {
        console.error("[Backend] Error updating user profile:", err);
        if (err.code === 11000 && err.keyPattern?.email) return res.status(400).json({ status: 'fail', message: 'Email address already in use.' });
        if (err.name === 'ValidationError') {
             const errors = Object.values(err.errors).map(el => el.message);
             return res.status(400).json({ status: 'fail', message: `Invalid input data. ${errors.join('. ')}` });
        }
        next(err);
    }
};

/**
 * @desc     Get user profile details
 * @route    GET /api/users/:id
 * @access   Private/Public (depends on selected fields)
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        const isOwnProfileOrAdmin = req.user && (req.user.id === id || req.user.role === 'admin');
        let selectFields = 'name level createdAt';
        if (isOwnProfileOrAdmin) { selectFields = '-password -passwordResetOtp -passwordResetExpires'; }
        const userQuery = User.findById(id).select(selectFields);
        const user = await userQuery.lean();
        if (!user) return res.status(404).json({ status: 'fail', message: 'User not found' });
        if (isOwnProfileOrAdmin && user.quizCompletedCount !== undefined && user.quizTotalPercentageScoreSum !== undefined) {
             const count = user.quizCompletedCount || 0;
             const sum = user.quizTotalPercentageScoreSum || 0;
             user.quizAccuracyRate = count > 0 ? Math.round(Math.max(0, sum / count)) : 0;
        }
        res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
        console.error("[Backend] Error fetching user profile:", err);
        next(err);
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
        if (!req.user) return res.status(401).json({ status: 'fail', message: 'Not authorized. Please log in.' });
        if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this progress data' });
        const progressRecords = await UserProgress.find({ user: id }).populate('subject', 'name color icon').lean();
        const formattedProgress = progressRecords.map(item => {
            if (!item.subject) return null;
            const overallProgress = item.overallSubjectProgress || 0;
            return { subjectId: item.subject._id.toString(), name: item.subject.name, color: item.subject.color, icon: item.subject.icon, overallProgress: overallProgress, lastUpdated: item.updatedAt?.toISOString() };
        }).filter(p => p !== null);
        res.status(200).json({ status: 'success', results: formattedProgress.length, data: { progress: formattedProgress } });
    } catch (err) {
        console.error("[Backend] Error fetching user progress:", err);
        next(err);
    }
};


/**
 * @desc     Get user's active dates for the calendar
 * @route    GET /api/users/:userId/activity-dates
 * @access   Private
 */
exports.getUserActivityDates = async (req, res, next) => {
    try {
        const { userId } = req.params;
        if (!isValidObjectId(userId)) return res.status(400).json({ status: 'fail', message: 'Invalid User ID format' });
        if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) return res.status(403).json({ status: 'fail', message: 'You do not have permission to access this data' });
        const queryDate = req.query.month ? new Date(req.query.month + '-01T00:00:00Z') : new Date(); // Ensure parsing as UTC start of month
        if (isNaN(queryDate)) return res.status(400).json({ status: 'fail', message: 'Invalid month query parameter format. Use YYYY-MM.' });
        const startDate = startOfMonth(queryDate);
        const endDate = endOfMonth(queryDate);
        // console.log(`[getUserActivityDates] Fetching dates for user ${userId} between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}`);
        const activityLogs = await DailyActivityLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date').lean();
        const activeDates = activityLogs.map(log => format(log.date, 'yyyy-MM-dd')); // Format consistently
        // console.log(`[getUserActivityDates] Found ${activeDates.length} active dates.`);
        res.status(200).json({ status: 'success', data: { dates: activeDates } });
    } catch (err) {
        console.error("[getUserActivityDates] Error:", err);
        next(err);
    }
};
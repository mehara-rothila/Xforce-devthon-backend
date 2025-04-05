// controllers/userController.js
const User = require('../models/userModel');
const UserProgress = require('../models/userProgressModel');
const Subject = require('../models/subjectModel');
const Achievement = require('../models/achievementModel'); // <-- Import Achievement model
// const catchAsync = require('../utils/catchAsync'); // Optional: Uncomment if you set up catchAsync
// const AppError = require('../utils/appError');    // Optional: Uncomment if you set up AppError

/**
 * @desc    Get summary data for the dashboard sidebar for a specific user
 * @route   GET /api/users/:userId/dashboard-summary
 * @access  Private (Temporary: Public for testing without auth)
 */
exports.getDashboardSummary = async (req, res, next) => {
  // Restore original logic but keep manual stringify send method
  try {
    const userId = req.params.userId;
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
                                         .populate('subject', 'name color'); // Populate subject name and color
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
        return {
            subjectId: record?.subject?._id || null,
            name: record?.subject?.name || 'Unknown Subject',
            color: record?.subject?.color || '#808080',
            progress: calculatedProgress
        };
    }).filter(sp => sp.subjectId !== null);
    console.log("[Backend] Calculated subjectProgress:", JSON.stringify(overallProgressPerSubject, null, 2));

    // 4. Calculate Points to Next Level
    const xpForNextLevel = (user.level + 1) * 150; // Example calculation
    const pointsToNextLevel = Math.max(0, xpForNextLevel - user.xp);
    console.log(`[Backend] Level: ${user.level}, XP: ${user.xp}, XP for next: ${xpForNextLevel}, Points to next: ${pointsToNextLevel}`);

    // 5. Leaderboard Rank (Placeholder)
    const leaderboardRank = 'Top 15%';

    // 6. Prepare Response Data Object
    const dashboardSummary = {
        userName: user.name,
        level: user.level,
        xp: user.xp,
        pointsToNextLevel: pointsToNextLevel,
        streak: user.streak,
        points: user.points,
        leaderboardRank: leaderboardRank,
        subjectProgress: overallProgressPerSubject,
    };
    console.log("[Backend] Final dashboardSummary object:", JSON.stringify(dashboardSummary, null, 2));

    // 7. Prepare final payload structure
    const finalPayload = {
        status: 'success',
        data: {
            summary: dashboardSummary
        }
    };

    // --- SEND MANUALLY STRINGIFIED JSON ---
    console.log("[Backend] Sending MANUALLY STRINGIFIED success response for summary...");
    const jsonString = JSON.stringify(finalPayload);
    res.setHeader('Content-Type', 'application/json'); // Set header explicitly
    res.status(200).send(jsonString); // Use res.send() with the stringified JSON

  } catch (err) {
    console.error("[Backend] Error in getDashboardSummary:", err);
    if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard summary' });
    } else {
        console.error("[Backend] Headers already sent, cannot send error JSON for getDashboardSummary.");
    }
  }
};


/**
 * @desc    Get detailed topic progress for a specific user and subject
 * @route   GET /api/users/:userId/progress/:subjectId
 * @access  Private (Temporary: Public for testing without auth)
 */
exports.getDetailedSubjectProgress = async (req, res, next) => {
    try {
        const { userId, subjectId } = req.params;
        console.log(`[Backend] Fetching detailed progress for user: ${userId}, subject: ${subjectId}`);

        // Find the specific progress document
        const progressDoc = await UserProgress.findOne({ user: userId, subject: subjectId })
                                            .populate({
                                                path: 'subject',
                                                select: 'name color topics', // Select necessary fields from Subject
                                            });

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
             const topicA = progressDoc.subject.topics.find(st => st._id.toString() === a.id);
             const topicB = progressDoc.subject.topics.find(st => st._id.toString() === b.id);
             return (topicA?.order ?? Infinity) - (topicB?.order ?? Infinity);
        });

        console.log(`[Backend] Mapped detailedTopicProgress:`, JSON.stringify(detailedTopicProgress, null, 2));

        // Prepare the response data structure
        const responseData = {
            subjectId: progressDoc.subject._id,
            subjectName: progressDoc.subject.name,
            subjectColor: progressDoc.subject.color,
            overallProgress: progressDoc.overallSubjectProgress || 0,
            topics: detailedTopicProgress,
            analytics: { // Placeholder analytics
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
        const jsonString = JSON.stringify(finalPayload);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(jsonString); // Use manual stringify

    } catch (err) {
        console.error("[Backend] Error in getDetailedSubjectProgress:", err);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch detailed progress' });
        } else {
             console.error("[Backend] Headers already sent, cannot send error JSON for getDetailedSubjectProgress.");
        }
    }
};


/**
 * @desc    Get all achievements, indicating which are unlocked by the user
 * @route   GET /api/users/:userId/achievements
 * @access  Private (Temporary: Public for testing without auth)
 */
exports.getUserAchievements = async (req, res, next) => {
    try {
        const { userId } = req.params;
        console.log(`[Backend] Fetching achievements for user: ${userId}`);

        // Fetch the user, selecting only the achievements field
        const user = await User.findById(userId).select('achievements');

        if (!user) {
            console.log(`[Backend] User not found for achievements: ${userId}`);
            return res.status(404).json({ status: 'fail', message: 'User not found.' });
        }

        // Create a Set of unlocked achievement IDs (as strings) for quick lookup
        const unlockedAchievementIds = new Set(user.achievements.map(id => id.toString()));
        console.log(`[Backend] User has ${unlockedAchievementIds.size} unlocked achievements.`);

        // Fetch ALL defined achievements
        const allAchievements = await Achievement.find({}).lean(); // Use .lean() for plain JS objects
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
                // TODO: Add progress/totalNeeded/dateUnlocked later if needed
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
        const jsonString = JSON.stringify(finalPayload);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(jsonString); // Use manual stringify

    } catch (err) {
        console.error("[Backend] Error in getUserAchievements:", err);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch user achievements' });
        } else {
             console.error("[Backend] Headers already sent, cannot send error JSON for getUserAchievements.");
        }
    }
};


// --- Keep Placeholder Functions ---
exports.getUserProfile = async (req, res, next) => {
    console.log(`[Backend] Placeholder hit for getUserProfile for ID: ${req.params.id}`);
    res.status(501).json({ status: 'fail', message: 'Get user profile route not implemented yet' });
};
exports.updateUserProfile = async (req, res, next) => {
    console.log(`[Backend] Placeholder hit for updateUserProfile for ID: ${req.params.id} with data:`, req.body);
    res.status(501).json({ status: 'fail', message: 'Update user profile route not implemented yet' });
};
exports.getUserProgress = async (req, res, next) => {
    console.log(`[Backend] Placeholder hit for getUserProgress for ID: ${req.params.id}`);
    res.status(501).json({ status: 'fail', message: 'Get user progress route not implemented yet' });
};

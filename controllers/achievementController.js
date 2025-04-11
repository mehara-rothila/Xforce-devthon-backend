// controllers/achievementController.js
const mongoose = require('mongoose');
const Achievement = require('../models/achievementModel');
const User = require('../models/userModel');
const QuizAttempt = require('../models/quizAttemptModel');
const ResourceAccess = require('../models/resourceAccessModel');
const ForumTopic = require('../models/forumTopicModel');
const ForumReply = require('../models/forumReplyModel');
const LoginActivityLog = require('../models/loginActivityLogModel');

/**
 * @desc    Get all achievements
 * @route   GET /api/achievements
 * @access  Private/Admin
 */
exports.getAllAchievements = async (req, res, next) => {
  try {
    const achievements = await Achievement.find();
    
    res.status(200).json({
      status: 'success',
      results: achievements.length,
      data: {
        achievements
      }
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    next(error);
  }
};

/**
 * @desc    Create a new achievement
 * @route   POST /api/achievements
 * @access  Private/Admin
 */
exports.createAchievement = async (req, res, next) => {
  try {
    // Validate the required fields
    const { title, description, category, trigger, requirement } = req.body;
    
    if (!title || !description || !category || !trigger) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide title, description, category, and trigger'
      });
    }
    
    const newAchievement = await Achievement.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        achievement: newAchievement
      }
    });
  } catch (error) {
    console.error("Error creating achievement:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * @desc    Update an achievement
 * @route   PATCH /api/achievements/:id
 * @access  Private/Admin
 */
exports.updateAchievement = async (req, res, next) => {
  try {
    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!achievement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Achievement not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        achievement
      }
    });
  } catch (error) {
    console.error("Error updating achievement:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * @desc    Delete an achievement
 * @route   DELETE /api/achievements/:id
 * @access  Private/Admin
 */
exports.deleteAchievement = async (req, res, next) => {
  try {
    const achievement = await Achievement.findByIdAndDelete(req.params.id);
    
    if (!achievement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Achievement not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    next(error);
  }
};

/**
 * @desc    Get user achievements with unlock status
 * @route   GET /api/users/:userId/achievements
 * @access  Private
 */
exports.getUserAchievements = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only see their own achievements (unless admin)
    if (req.user && req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access these records'
      });
    }
    
    // Get all achievements
    const achievements = await Achievement.find();
    
    // Get the user's unlocked achievements
    const user = await User.findById(userId).select('achievements');
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Create a set of unlocked achievement IDs for faster lookup
    const unlockedAchievementIds = new Set(user.achievements.map(id => id.toString()));
    
    // Map achievements for response
    const achievementsWithStatus = await Promise.all(
      achievements.map(async (achievement) => {
        const isUnlocked = unlockedAchievementIds.has(achievement._id.toString());
        
        // Calculate progress for locked achievements
        let progress = 0;
        let totalNeeded = achievement.requirement || 1;
        
        if (!isUnlocked) {
          progress = await calculateAchievementProgress(userId, achievement);
        }
        
        // Format date if achievement is unlocked
        // Note: This is a placeholder - consider adding a field to track unlock dates
        const dateUnlocked = isUnlocked ? 
          // This is a placeholder approach - in a real implementation, you'd store
          // the actual unlock date when an achievement is granted
          // For now we'll use a random recent date for demo purposes
          new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
            .toISOString().split('T')[0] : 
          null;
        
        return {
          id: achievement._id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          unlocked: isUnlocked,
          progress: isUnlocked ? 100 : Math.min(100, Math.round((progress / totalNeeded) * 100)),
          totalNeeded,
          xp: achievement.xp,
          points: achievement.points || 0,
          rarity: achievement.rarity,
          dateUnlocked
        };
      })
    );
    
    res.status(200).json({
      status: 'success',
      results: achievementsWithStatus.length,
      data: {
        achievements: achievementsWithStatus
      }
    });
  } catch (error) {
    console.error("Error getting user achievements:", error);
    next(error);
  }
};

/**
 * Check quiz-related achievements after a quiz submission
 * @param {string} userId - User ID 
 * @param {object} quizResult - Quiz submission results (percentageScore, passed, etc.)
 * @returns {Promise<object>} Object containing awarded achievements
 */
exports.checkQuizAchievements = async (userId, quizResult) => {
  if (!userId) return { awarded: [] };
  
  try {
    // Get user with their current achievements and quiz points
    const user = await User.findById(userId).select('achievements quizPointsEarned xp points level');
    if (!user) return { awarded: [] };
    
    // Get user's achievements IDs for quick lookup
    const userAchievementIds = user.achievements.map(a => a.toString());
    
    // Get quiz-related achievements that the user hasn't earned yet
    const achievementsToCheck = await Achievement.find({
      _id: { $nin: userAchievementIds },
      $or: [
        { trigger: 'quiz_perfect_score' },
        { trigger: 'quiz_completion' },
        { trigger: 'quiz_points' }  // NEW: Added quiz_points trigger
      ]
    });
    
    const newlyAwarded = [];
    const quizAttempts = await QuizAttempt.find({ user: userId });
    
    // Check each achievement
    for (const achievement of achievementsToCheck) {
      let isAchieved = false;
      
      switch (achievement.trigger) {
        case 'quiz_perfect_score':
          // Check if current quiz is a perfect score
          if (quizResult.percentageScore === 100) {
            // If there's a difficulty condition, check it
            if (achievement.condition && achievement.condition.difficulty) {
              if (quizResult.difficulty === achievement.condition.difficulty) {
                isAchieved = true;
              }
            } else {
              // No difficulty condition, just need a perfect score
              isAchieved = true;
            }
          }
          break;
          
        case 'quiz_completion':
          // Get relevant quiz attempts based on conditions
          let relevantAttempts = [...quizAttempts];
          
          // Apply conditions if they exist
          if (achievement.condition) {
            // Filter by passed
            if (achievement.condition.passed) {
              relevantAttempts = relevantAttempts.filter(a => a.passed);
            }
            
            // Filter by minimum score
            if (achievement.condition.minScore) {
              relevantAttempts = relevantAttempts.filter(a => a.percentageScore >= achievement.condition.minScore);
            }
            
            // Filter by difficulty
            if (achievement.condition.difficulty) {
              // This would require populating the quiz details to check difficulty
              // For simplicity in this example, we'll just check if the current quiz matches
              if (quizResult.difficulty === achievement.condition.difficulty) {
                // Count as 1 towards the requirement if current quiz meets criteria
                if ((achievement.condition.passed && quizResult.passed) || 
                    (achievement.condition.minScore && quizResult.percentageScore >= achievement.condition.minScore)) {
                  // Check if we now meet the requirement
                  if (relevantAttempts.length + 1 >= achievement.requirement) {
                    isAchieved = true;
                  }
                }
              }
            } else {
              // No difficulty filter, just check if we meet the count requirement
              if (relevantAttempts.length >= achievement.requirement) {
                isAchieved = true;
              }
              // If we're just 1 away and the current quiz counts, consider it achieved
              else if (relevantAttempts.length === achievement.requirement - 1) {
                if ((achievement.condition.passed && quizResult.passed) || 
                    (achievement.condition.minScore && quizResult.percentageScore >= achievement.condition.minScore)) {
                  isAchieved = true;
                }
              }
            }
          } else {
            // No conditions, just check if we've completed enough quizzes
            if (relevantAttempts.length >= achievement.requirement) {
              isAchieved = true;
            }
            // If we're just 1 away, count the current attempt
            else if (relevantAttempts.length === achievement.requirement - 1) {
              isAchieved = true;
            }
          }
          break;
          
        // NEW CASE: Check for quiz points achievements
        case 'quiz_points':
          // Check if user has reached the required quiz points
          if (user.quizPointsEarned >= achievement.requirement) {
            isAchieved = true;
          }
          break;
      }
      
      // Award achievement if conditions met
      if (isAchieved) {
        user.achievements.push(achievement._id);
        
        // Add XP from achievement
        user.xp += achievement.xp || 0;
        
        // Add points from achievement
        user.points += achievement.points || 0;
        
        // Track for response
        newlyAwarded.push({
          id: achievement._id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          xp: achievement.xp || 0,
          points: achievement.points || 0,
          rarity: achievement.rarity || 'common'
        });
      }
    }
    
    // Save user if any achievements were awarded
    if (newlyAwarded.length > 0) {
      await user.save();
      
      // Check for level up
      const oldLevel = user.level;
      const newLevel = Math.floor(1 + Math.sqrt(user.xp / 100));
      
      if (newLevel > oldLevel) {
        await User.findByIdAndUpdate(
          userId,
          { level: newLevel },
          { new: true }
        );
      }
    }
    
    return { awarded: newlyAwarded };
  } catch (error) {
    console.error('Error checking quiz achievements:', error);
    return { awarded: [], error: error.message };
  }
};

/**
 * Calculate a user's progress toward an achievement
 * @param {string} userId - User ID
 * @param {object} achievement - Achievement document
 * @returns {Promise<number>} Progress value
 */
async function calculateAchievementProgress(userId, achievement) {
  try {
    switch (achievement.trigger) {
      case 'quiz_perfect_score':
        // Count perfect scores
        const perfectScores = await QuizAttempt.countDocuments({
          user: userId,
          percentageScore: 100
        });
        return perfectScores;
      
      case 'quiz_completion':
        // Count quiz completions based on conditions
        let query = { user: userId };
        
        if (achievement.condition) {
          if (achievement.condition.passed) {
            query.passed = true;
          }
          
          if (achievement.condition.minScore) {
            query.percentageScore = { $gte: achievement.condition.minScore };
          }
          
          // Difficulty would require populating the quiz - simplified for this example
        }
        
        const completions = await QuizAttempt.countDocuments(query);
        return completions;
      
      // NEW CASE: Calculate progress for quiz points achievements
      case 'quiz_points':
        // Get the user's quiz points earned
        const user = await User.findById(userId).select('quizPointsEarned');
        return user ? user.quizPointsEarned : 0;
      
      case 'forum_posts':
        // Count forum topics created
        return await ForumTopic.countDocuments({ author: userId });
      
      case 'forum_replies':
        // Count forum replies
        return await ForumReply.countDocuments({ author: userId });
      
      case 'forum_best_answers':
        // Count best answers
        return await ForumReply.countDocuments({ 
          author: userId,
          isBestAnswer: true
        });
      
      case 'resource_access':
        // Count resource access by type if specified
        const resourceQuery = { user: userId };
        
        if (achievement.condition && achievement.condition.accessType) {
          resourceQuery.accessType = achievement.condition.accessType;
        }
        
        return await ResourceAccess.countDocuments(resourceQuery);
      
      case 'study_streak':
        // Get user's current streak
        const streakUser = await User.findById(userId).select('streak');
        return streakUser ? streakUser.streak : 0;
      
      default:
        return 0;
    }
  } catch (error) {
    console.error(`Error calculating achievement progress for ${achievement.title}:`, error);
    return 0;
  }
}

/**
 * @desc    Add custom achievements directly from an API endpoint
 * @route   POST /api/achievements/batch
 * @access  Private/Admin
 */
exports.addCustomAchievements = async (req, res, next) => {
  try {
    const { achievements } = req.body;
    
    if (!Array.isArray(achievements) || achievements.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of achievements'
      });
    }
    
    // Validate all achievements before inserting any
    for (const achievement of achievements) {
      const { title, description, category, trigger, requirement } = achievement;
      
      if (!title || !description || !category || !trigger || !requirement) {
        return res.status(400).json({
          status: 'fail',
          message: 'Each achievement must have title, description, category, trigger, and requirement'
        });
      }
    }
    
    // Insert the achievements
    const createdAchievements = await Achievement.insertMany(achievements);
    
    res.status(201).json({
      status: 'success',
      results: createdAchievements.length,
      data: {
        achievements: createdAchievements
      }
    });
  } catch (error) {
    console.error("Error adding batch achievements:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
    
    next(error);
  }
};
const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A reward must have a name.'],
    trim: true,
    maxlength: [100, 'Reward name must have less or equal than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'A reward must have a description.'],
    trim: true
  },
  pointsCost: {
    type: Number,
    required: [true, 'A reward must have a point cost.'],
    min: [0, 'Point cost cannot be negative.']
  },
  category: {
    type: String,
    required: [true, 'A reward must belong to a category.'],
    enum: {
      values: ['Study Materials', 'Premium Features', 'Events & Sessions', 'Profile & Cosmetics', 'Physical Rewards', 'Other'],
      message: 'Category must be one of: Study Materials, Premium Features, Events & Sessions, Profile & Cosmetics, Physical Rewards, Other'
    },
    default: 'Other'
  },
  image: {
    type: String, // Can store emoji, icon name, or image URL/path
    default: '🎁'
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative.'],
    default: null // Use null to represent infinite stock unless specified
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: false
  },
  isActive: { // To allow admins to enable/disable rewards without deleting
    type: Boolean,
    default: true,
    select: false // Hide from normal user queries by default
  },
  // --- NEW FIELD ---
  subject: { // Optional link to a specific subject
    type: mongoose.Schema.ObjectId,
    ref: 'Subject',
    required: false // Make it optional, not all rewards belong to a subject
  },
  // ---------------
  // Optional: Track who redeemed what (better in a separate Redemption collection)
  // redeemedBy: [{
  //   type: mongoose.Schema.ObjectId,
  //   ref: 'User'
  // }]
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster querying
rewardSchema.index({ pointsCost: 1 });
rewardSchema.index({ category: 1 });
rewardSchema.index({ isActive: 1 });
rewardSchema.index({ subject: 1 }); // Add index for subject filtering


const Reward = mongoose.model('Reward', rewardSchema);

module.exports = Reward;
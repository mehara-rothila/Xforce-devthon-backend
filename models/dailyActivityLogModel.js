// models/dailyActivityLogModel.js
const mongoose = require('mongoose');
const { startOfDay } = require('date-fns'); // Import date-fns helper

const dailyActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  // Store only the date part (YYYY-MM-DD) for easy querying by day
  // Mongoose stores Dates in UTC by default.
  date: {
    type: Date,
    required: true,
  },
  // Optional: Store the exact timestamp of the last activity for this day
  lastTimestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false }); // We don't need createdAt/updatedAt for this specific log

// Compound index for efficient lookups and ensuring uniqueness per user per day
dailyActivityLogSchema.index({ user: 1, date: 1 }, { unique: true });

// Set date to the beginning of the day in UTC before saving
// This ensures consistency when querying by date range
dailyActivityLogSchema.pre('save', function(next) {
  if ((this.isModified('date') || this.isNew) && this.date instanceof Date) {
    // Use date-fns startOfDay which handles timezones correctly if needed,
    // but for consistency, let's stick to UTC start of day.
    const startOfDayUTC = new Date(this.date);
    startOfDayUTC.setUTCHours(0, 0, 0, 0);
    this.date = startOfDayUTC;
  }
  next();
});

// This pre-hook for findOneAndUpdate is tricky with date normalization.
// It's often safer to normalize the date *before* calling findOneAndUpdate
// in the controller logic, as done in authController.js.
// dailyActivityLogSchema.pre('findOneAndUpdate', function(next) {
//   const update = this.getUpdate();
//   if (update.$set && update.$set.date && update.$set.date instanceof Date) {
//      const startOfDayUTC = new Date(update.$set.date);
//      startOfDayUTC.setUTCHours(0,0,0,0);
//      update.$set.date = startOfDayUTC;
//   }
//   // Handle $setOnInsert cases if necessary
//   next();
// });


const DailyActivityLog = mongoose.model('DailyActivityLog', dailyActivityLogSchema);

module.exports = DailyActivityLog;
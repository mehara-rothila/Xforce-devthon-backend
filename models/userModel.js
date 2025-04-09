// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Needed for password comparison or middleware

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    // Consider adding match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  // --- NEW FIELD ---
  phoneNumber: {
    type: String,
    trim: true,
    // Optional: Add validation later if needed (e.g., specific format)
    // match: [/^\+?[0-9]{10,15}$/, 'Please fill a valid phone number']
    // unique: true, // Consider if phone numbers MUST be unique
  },
  // ---------------
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Hide password by default when querying users
  },
  subjects: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Subject'
  }],
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  reputation: {
    type: Number,
    default: 0
  },
  // joinedDate: { type: Date, default: Date.now }, // Replaced by timestamps: true
  lastActive: {
    type: Date,
    default: Date.now
  },
  streak: {
    type: Number,
    default: 0
  },
  achievements: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Achievement'
  }],
  points: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: {
        values: ['user', 'admin', 'moderator'],
        message: 'Role must be either: user, admin, or moderator'
    },
    default: 'user'
  },

  // --- Fields for Password Reset ---
  passwordResetOtp: {
      type: String,
      select: false // Hide OTP hash by default
  },
  passwordResetExpires: {
      type: Date,
      select: false // Hide expiry by default
  }
  // ------------------------------------

}, {
  // Schema Options
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  toJSON: { virtuals: true }, // Include virtuals when document is converted to JSON
  toObject: { virtuals: true } // Include virtuals when document is converted to plain object
});

// --- Mongoose Middleware ---

// Example: Password Hashing Middleware (Uncomment if you prefer hashing here instead of controller)
/*
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field if you used it for registration validation
  // this.passwordConfirm = undefined;
  next();
});
*/

// Example: OTP Hashing Middleware (Uncomment if you prefer hashing here instead of controller)
/*
userSchema.pre('save', async function(next) {
  // Only run if OTP is modified and exists
  if (!this.isModified('passwordResetOtp') || !this.passwordResetOtp) return next();

  // Hash the OTP (use a lower cost factor than passwords, e.g., 10)
  this.passwordResetOtp = await bcrypt.hash(this.passwordResetOtp, 10);
  next();
});
*/

// --- Instance Methods ---

// Example: Method to compare candidate password with stored hash (useful if not using middleware)
// userSchema.methods.correctPassword = async function(
//   candidatePassword,
//   userPassword // The hashed password from the database
// ) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };


const User = mongoose.model('User', userSchema);

module.exports = User;
// models/resourceAccessModel.js
const mongoose = require('mongoose');

const resourceAccessSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  resource: {
    type: mongoose.Schema.ObjectId,
    ref: 'Resource',
    required: true
  },
  accessType: {
    type: String,
    enum: ['view', 'download'],
    default: 'view'
  }
}, { timestamps: true });

const ResourceAccess = mongoose.model('ResourceAccess', resourceAccessSchema);
module.exports = ResourceAccess;
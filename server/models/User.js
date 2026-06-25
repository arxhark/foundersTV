const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photo: { type: String, default: '' },
  country: { type: String, default: '' },
  startup: { type: String, default: '', maxlength: 100 },
  stage: {
    type: String,
    enum: ['idea', 'validating', 'mvp', 'growth', 'scaling'],
    default: 'idea',
  },
  sector: {
    type: String,
    enum: ['tech', 'health', 'education', 'fintech', 'ecommerce', 'sustainability', 'entertainment', 'other'],
    default: 'tech',
  },
  looking_for: [{
    type: String,
    enum: ['cofounder', 'feedback', 'investment', 'clients', 'networking'],
  }],
  linkedin: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  onboardingComplete: { type: Boolean, default: false },
  stats: {
    totalConnections: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    savedContacts: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

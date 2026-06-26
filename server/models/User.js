const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ── Identity / auth ──────────────────────────────────────────────
  googleId: { type: String, sparse: true, unique: true },
  appleId: { type: String, sparse: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  authProvider: {
    type: String,
    enum: ['google', 'apple', 'email'],
    default: 'email',
  },
  emailVerified: { type: Boolean, default: false },

  // ── Public profile ───────────────────────────────────────────────
  name: { type: String, required: true },
  photo: { type: String, default: '' },        // profile image URL
  title: { type: String, default: '', maxlength: 80 },   // "Co-founder @ BuildFast"
  projectBio: { type: String, default: '', maxlength: 140 },
  country: { type: String, default: '' },

  // ── Founder attributes ───────────────────────────────────────────
  role: {
    type: String,
    enum: ['founder', 'developer', 'investor', 'designer', 'pm', 'marketing', 'student'],
    default: 'founder',
  },
  stage: {
    type: String,
    enum: ['idea', 'validating', 'pre-revenue', 'revenue', 'scaling', 'corporate'],
    default: 'idea',
  },
  lookingFor: [{
    type: String,
    enum: ['cofounder', 'investment', 'feedback', 'mentorship', 'clients', 'tech', 'networking'],
  }],
  tags: {
    type: [String],
    validate: [(arr) => arr.length <= 5, 'Maximum 5 tags allowed'],
    default: [],
  },
  language: { type: String, enum: ['es', 'en', 'pt'], default: 'en' },

  // ── Social links ─────────────────────────────────────────────────
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  twitter: { type: String, default: '' },
  website: { type: String, default: '' },

  // ── Status / moderation ──────────────────────────────────────────
  isActive: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  isPro: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  onboardingComplete: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Stats ────────────────────────────────────────────────────────
  sessionsCount: { type: Number, default: 0 },
  stats: {
    totalConnections: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    savedContacts: { type: Number, default: 0 },
  },
}, { timestamps: true });

// Returns the lightweight profile shared with peers during a call / in cards
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    photo: this.photo,
    title: this.title,
    projectBio: this.projectBio,
    role: this.role,
    stage: this.stage,
    lookingFor: this.lookingFor,
    tags: this.tags,
    language: this.language,
    country: this.country,
    linkedin: this.linkedin,
    github: this.github,
    twitter: this.twitter,
    website: this.website,
    isVerified: this.isVerified,
    isPro: this.isPro,
    sessionsCount: this.sessionsCount,
  };
};

module.exports = mongoose.model('User', userSchema);

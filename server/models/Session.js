const mongoose = require('mongoose');

// One record per random video session between two founders
const sessionSchema = new mongoose.Schema({
  userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  duration: { type: Number, default: 0 },   // seconds
  savedByA: { type: Boolean, default: false },
  savedByB: { type: Boolean, default: false },
  tagsMatched: [{ type: String }],
}, { timestamps: true });

sessionSchema.index({ userA: 1, createdAt: -1 });
sessionSchema.index({ userB: 1, createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);

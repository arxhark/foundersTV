const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  savedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '', maxlength: 500 },
  connectedAt: { type: Date, default: Date.now },
});

// Prevent duplicate saved contacts
connectionSchema.index({ userId: 1, savedUserId: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);

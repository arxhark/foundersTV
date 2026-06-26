const mongoose = require('mongoose');

// Private video room (up to 4 participants). The shareable link uses `roomId`.
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Private room', maxlength: 80 },
  lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-expire rooms 2 hours after the last activity (TTL index)
roomSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 2 * 60 * 60 });

module.exports = mongoose.model('Room', roomSchema);

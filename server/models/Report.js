const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'bot', 'harassment', 'other'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'actioned'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);

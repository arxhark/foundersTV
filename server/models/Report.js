const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'bot'],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);

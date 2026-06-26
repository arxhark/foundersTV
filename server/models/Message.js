const mongoose = require('mongoose');

// Direct 1:1 message between two mutually-connected users
const messageSchema = new mongoose.Schema({
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000 },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ connectionId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true });

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false });

// Community feed post
const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['update', 'search', 'milestone', 'question'],
    default: 'update',
  },
  text: { type: String, required: true, maxlength: 2000 },
  image: { type: String, default: '' },
  reactions: [reactionSchema],
  comments: [commentSchema],
}, { timestamps: true });

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);

const mongoose = require('mongoose');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const { validatePost } = require('../utils/validators');
const { cleanText } = require('../utils/moderation');

const AUTHOR_FIELDS = 'name photo title role stage tags isVerified';

const createPost = async (req, res) => {
  try {
    const { value, valid, errors } = validatePost(req.body);
    if (!valid) return res.status(400).json({ error: 'Validation failed', fields: errors });

    const post = await Post.create({
      authorId: req.user._id,
      type: value.type,
      text: cleanText(value.text),
      image: value.image || '',
    });
    const populated = await post.populate('authorId', AUTHOR_FIELDS);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Feed prioritizes posts from people you're mutually connected with.
const listFeed = async (req, res) => {
  try {
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const limit = 20;

    const conns = await Connection.find({ users: req.user._id, mutual: true }).select('users').lean();
    const connectedIds = new Set();
    conns.forEach((c) => c.users.forEach((u) => {
      if (u.toString() !== req.user._id.toString()) connectedIds.add(u.toString());
    }));

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('authorId', AUTHOR_FIELDS)
      .populate('comments.userId', 'name photo')
      .lean();

    // Boost posts from connections to the top within the page
    posts.sort((a, b) => {
      const aC = connectedIds.has(a.authorId?._id?.toString()) ? 1 : 0;
      const bC = connectedIds.has(b.authorId?._id?.toString()) ? 1 : 0;
      return bC - aC;
    });

    const shaped = posts.map((p) => ({
      ...p,
      reactionCount: p.reactions.length,
      myReaction: p.reactions.find((r) => r.userId.toString() === req.user._id.toString())?.emoji || null,
      reactions: undefined,
    }));

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle a reaction (one per user per post)
const reactToPost = async (req, res) => {
  try {
    const { emoji } = req.body;
    const allowed = ['👏', '🔥', '🤝', '💡', '🚀', '🎉'];
    if (!allowed.includes(emoji)) return res.status(400).json({ error: 'Invalid reaction' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = post.reactions.find((r) => r.userId.toString() === req.user._id.toString());
    if (existing && existing.emoji === emoji) {
      post.reactions = post.reactions.filter((r) => r.userId.toString() !== req.user._id.toString());
    } else if (existing) {
      existing.emoji = emoji;
    } else {
      post.reactions.push({ emoji, userId: req.user._id });
    }
    await post.save();
    res.json({ reactionCount: post.reactions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const commentOnPost = async (req, res) => {
  try {
    const text = (req.body.text || '').trim().slice(0, 1000);
    if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { userId: req.user._id, text: cleanText(text) } } },
      { new: true }
    ).populate('comments.userId', 'name photo');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json(post.comments[post.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
    if (!post) return res.status(404).json({ error: 'Post not found or not yours' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createPost, listFeed, reactToPost, commentOnPost, deletePost };

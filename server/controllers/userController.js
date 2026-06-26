const mongoose = require('mongoose');
const User = require('../models/User');
const Report = require('../models/Report');
const { validateProfile } = require('../utils/validators');

const updateProfile = async (req, res) => {
  try {
    // validateProfile only returns known, type/format-checked fields.
    // Protected fields (googleId, email, stats, isPro…) can never be set here.
    const { value: updates, errors, valid } = validateProfile(req.body);

    if (!valid) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    if (req.file) updates.photo = req.file.path; // Cloudinary URL

    // onboarding completion is decided server-side, not from client input
    updates.onboardingComplete = true;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId -appleId -__v');

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const togglePause = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isPaused: !req.user.isPaused },
      { new: true }
    ).select('isPaused');
    res.json({ isPaused: user.isPaused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public profile by id (for /profile/:id)
const getPublicProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.toPublicProfile());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reportUser = async (req, res) => {
  try {
    const { reportedId, reason, sessionId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(reportedId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (reportedId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }
    await Report.create({
      reporterId: req.user._id,
      reportedId,
      reason,
      sessionId: mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : undefined,
    });
    res.json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Block a user: they can never match with the blocker again
const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: userId } });
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOnlineCount = (req, res) => {
  res.json({ count: req.app.get('onlineCount') || 0 });
};

module.exports = {
  updateProfile, togglePause, getPublicProfile,
  reportUser, blockUser, unblockUser, getOnlineCount,
};

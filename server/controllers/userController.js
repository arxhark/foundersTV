const mongoose = require('mongoose');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Report = require('../models/Report');

// Fields a user is never allowed to write directly via the API.
// Stats are incremented server-side only; googleId and email come from OAuth.
const PROTECTED_FIELDS = ['googleId', 'email', 'stats', 'isActive', 'onboardingComplete', '_id', '__v'];

const stripProtected = (obj) => {
  const clean = { ...obj };
  PROTECTED_FIELDS.forEach((f) => delete clean[f]);
  return clean;
};

// Whitelist of fields the user may update on their own profile
const ALLOWED_PROFILE_FIELDS = ['name', 'country', 'startup', 'stage', 'sector', 'looking_for', 'linkedin', 'photo'];

const updateProfile = async (req, res) => {
  try {
    const raw = stripProtected(req.body);

    // Build update from whitelisted fields only
    const updates = {};
    ALLOWED_PROFILE_FIELDS.forEach((f) => {
      if (f in raw) updates[f] = raw[f];
    });

    if (updates.looking_for) {
      updates.looking_for = Array.isArray(updates.looking_for)
        ? updates.looking_for
        : [updates.looking_for];
    }

    if (req.file) updates.photo = req.file.path;

    // Mark onboarding complete only server-side — not from client input
    updates.onboardingComplete = true;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId -__v');

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

// Only returns contacts belonging to the authenticated user
const getContacts = async (req, res) => {
  try {
    const connections = await Connection.find({ userId: req.user._id })
      .populate('savedUserId', 'name photo country startup stage sector linkedin looking_for')
      .sort({ connectedAt: -1 });
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const saveContact = async (req, res) => {
  try {
    const { savedUserId, notes } = req.body;

    // Validate savedUserId is a real ObjectId
    if (!mongoose.Types.ObjectId.isValid(savedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (savedUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot save yourself' });
    }

    // Confirm the target user actually exists
    const targetExists = await User.exists({ _id: savedUserId });
    if (!targetExists) return res.status(404).json({ error: 'User not found' });

    const connection = await Connection.findOneAndUpdate(
      { userId: req.user._id, savedUserId },
      { notes: notes?.slice(0, 500) ?? '', connectedAt: new Date() },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.savedContacts': 1 } });
    res.json(connection);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Contact already saved' });
    res.status(500).json({ error: err.message });
  }
};

// Ownership is already verified by the ownConnection middleware before this runs
const deleteContact = async (req, res) => {
  try {
    await req.resource.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.savedContacts': -1 } });
    res.json({ message: 'Contact removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reportUser = async (req, res) => {
  try {
    const { reportedId, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportedId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Can't report yourself
    if (reportedId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    await Report.create({ reporterId: req.user._id, reportedId, reason });
    res.json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOnlineCount = (req, res) => {
  res.json({ count: req.app.get('onlineCount') || 0 });
};

module.exports = {
  updateProfile, togglePause, getContacts, saveContact,
  deleteContact, reportUser, getOnlineCount,
};

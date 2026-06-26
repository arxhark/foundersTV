const mongoose = require('mongoose');
const User = require('../models/User');
const Connection = require('../models/Connection');
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

// Only returns contacts belonging to the authenticated user
const getContacts = async (req, res) => {
  try {
    const connections = await Connection.find({ userId: req.user._id })
      .populate('savedUserId', 'name photo country title projectBio role stage tags lookingFor language linkedin github twitter website isVerified')
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

const User = require('../models/User');
const Connection = require('../models/Connection');
const Report = require('../models/Report');
const { cloudinary } = require('../config/cloudinary');

// Complete or update user profile (onboarding)
const updateProfile = async (req, res) => {
  try {
    const { name, country, startup, stage, sector, looking_for, linkedin } = req.body;
    const updates = { name, country, startup, stage, sector, linkedin, onboardingComplete: true };

    if (looking_for) {
      updates.looking_for = Array.isArray(looking_for) ? looking_for : [looking_for];
    }

    if (req.file) {
      updates.photo = req.file.path; // Cloudinary URL
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Toggle pause status
const togglePause = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isPaused: !req.user.isPaused },
      { new: true }
    );
    res.json({ isPaused: user.isPaused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all saved contacts for the authenticated user
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

// Save a contact after a call
const saveContact = async (req, res) => {
  try {
    const { savedUserId, notes } = req.body;
    if (savedUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot save yourself' });
    }

    const connection = await Connection.findOneAndUpdate(
      { userId: req.user._id, savedUserId },
      { notes, connectedAt: new Date() },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.savedContacts': 1 } });
    res.json(connection);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Contact already saved' });
    res.status(500).json({ error: err.message });
  }
};

// Delete a saved contact
const deleteContact = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const result = await Connection.findOneAndDelete({ _id: connectionId, userId: req.user._id });
    if (!result) return res.status(404).json({ error: 'Contact not found' });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.savedContacts': -1 } });
    res.json({ message: 'Contact removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Report a user
const reportUser = async (req, res) => {
  try {
    const { reportedId, reason } = req.body;
    await Report.create({ reporterId: req.user._id, reportedId, reason });
    res.json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get online founder count (passed from socket manager)
const getOnlineCount = (req, res) => {
  const count = req.app.get('onlineCount') || 0;
  res.json({ count });
};

module.exports = { updateProfile, togglePause, getContacts, saveContact, deleteContact, reportUser, getOnlineCount };

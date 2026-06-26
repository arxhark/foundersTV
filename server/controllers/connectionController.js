const mongoose = require('mongoose');
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const User = require('../models/User');
const { validateMessage } = require('../utils/validators');
const { cleanText } = require('../utils/moderation');

const PEER_FIELDS = 'name photo title projectBio role stage tags lookingFor language linkedin github twitter website isVerified';

// Save (connect with) another user. First save creates a pending connection;
// when both users have saved, it becomes mutual.
const saveConnection = async (req, res) => {
  try {
    const { peerId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(peerId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (peerId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }
    const peer = await User.findById(peerId).select('_id');
    if (!peer) return res.status(404).json({ error: 'User not found' });

    const pair = Connection.sortedPair(req.user._id, peerId);

    let conn = await Connection.findOneAndUpdate(
      { users: pair },
      { $setOnInsert: { users: pair }, $addToSet: { savedBy: req.user._id } },
      { upsert: true, new: true }
    );

    // Became mutual on this save?
    const becameMutual = !conn.mutual && conn.savedBy.length === 2;
    if (becameMutual) {
      conn.mutual = true;
      await conn.save();
      await User.updateMany(
        { _id: { $in: pair } },
        { $inc: { 'stats.savedContacts': 1 } }
      );

      // Notify both users in real time if they're connected
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${pair[0]}`).emit('connection:mutual', { connectionId: conn._id });
        io.to(`user:${pair[1]}`).emit('connection:mutual', { connectionId: conn._id });
      }
    }

    res.json({ mutual: conn.mutual, connectionId: conn._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List the authenticated user's mutual connections with peer profile,
// last message preview and unread count.
const listConnections = async (req, res) => {
  try {
    const conns = await Connection.find({ users: req.user._id, mutual: true })
      .sort({ updatedAt: -1 })
      .lean();

    const result = await Promise.all(conns.map(async (c) => {
      const peerId = c.users.find((u) => u.toString() !== req.user._id.toString());
      const [peer, lastMessage, unread] = await Promise.all([
        User.findById(peerId).select(PEER_FIELDS).lean(),
        Message.findOne({ connectionId: c._id }).sort({ createdAt: -1 }).lean(),
        Message.countDocuments({ connectionId: c._id, senderId: { $ne: req.user._id }, read: false }),
      ]);
      return {
        _id: c._id,
        peer: peer ? { ...peer, _id: peerId } : null,
        connectedAt: c.updatedAt,
        lastMessage: lastMessage ? { text: lastMessage.text, createdAt: lastMessage.createdAt } : null,
        unread,
      };
    }));

    res.json(result.filter((c) => c.peer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify the authenticated user belongs to the connection
const requireMembership = async (connectionId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(connectionId)) return null;
  const conn = await Connection.findOne({ _id: connectionId, users: userId, mutual: true });
  return conn;
};

const getMessages = async (req, res) => {
  try {
    const conn = await requireMembership(req.params.connectionId, req.user._id);
    if (!conn) return res.status(403).json({ error: 'Not a member of this connection' });

    const messages = await Message.find({ connectionId: conn._id }).sort({ createdAt: 1 }).lean();

    // Mark peer's messages as read
    await Message.updateMany(
      { connectionId: conn._id, senderId: { $ne: req.user._id }, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const conn = await requireMembership(req.params.connectionId, req.user._id);
    if (!conn) return res.status(403).json({ error: 'Not a member of this connection' });

    const { value, valid, errors } = validateMessage(req.body);
    if (!valid) return res.status(400).json({ error: 'Validation failed', fields: errors });

    const message = await Message.create({
      connectionId: conn._id,
      senderId: req.user._id,
      text: cleanText(value.text),
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { saveConnection, listConnections, getMessages, sendMessage };

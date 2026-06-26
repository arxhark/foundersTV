const crypto = require('crypto');
const Room = require('../models/Room');

const genId = () => crypto.randomBytes(6).toString('hex'); // 12-char room id

const createRoom = async (req, res) => {
  try {
    const title = (req.body.title || 'Private room').slice(0, 80);
    let roomId;
    // Ensure uniqueness (collisions are astronomically unlikely but cheap to check)
    // eslint-disable-next-line no-await-in-loop
    do { roomId = genId(); } while (await Room.exists({ roomId }));

    const room = await Room.create({ roomId, hostId: req.user._id, title });
    res.json({ roomId: room.roomId, title: room.title, hostId: room.hostId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('hostId', 'name photo');
    if (!room) return res.status(404).json({ error: 'Room not found or expired' });
    res.json({ roomId: room.roomId, title: room.title, host: room.hostId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createRoom, getRoom };

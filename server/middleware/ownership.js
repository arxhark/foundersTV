const Connection = require('../models/Connection');

// Ensures the authenticated user owns the requested Connection document.
// Attaches the document to req.resource so the controller can reuse it.
const ownConnection = async (req, res, next) => {
  try {
    const doc = await Connection.findById(req.params.connectionId);
    if (!doc) return res.status(404).json({ error: 'Contact not found' });
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.resource = doc;
    next();
  } catch {
    res.status(400).json({ error: 'Invalid ID' });
  }
};

module.exports = { ownConnection };

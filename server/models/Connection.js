const mongoose = require('mongoose');

// A connection between two founders. Created the moment one person saves the
// other (pending); becomes `mutual` once both have saved. Direct messaging is
// unlocked only on mutual connections.
const connectionSchema = new mongoose.Schema({
  // Always stored sorted (low _id first) so a pair maps to exactly one doc
  users: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    validate: [(arr) => arr.length === 2, 'A connection must have exactly 2 users'],
  },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutual: { type: Boolean, default: false },
}, { timestamps: true });

connectionSchema.index({ users: 1 }, { unique: true });

// Returns the two user ids sorted as strings — used to build a stable pair key
connectionSchema.statics.sortedPair = function (a, b) {
  return [a.toString(), b.toString()].sort();
};

module.exports = mongoose.model('Connection', connectionSchema);

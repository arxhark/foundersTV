/**
 * In-memory matchmaking queue.
 * Each entry: { socketId, userId, userProfile, filters, blockedUsers, joinedAt }
 *   filters: { role?, stage?, language?, tags?: string[] }
 */
const queue = [];

// Active rooms: Map<roomId, { userA: socketId, userB: socketId }>
const activeRooms = new Map();
// Map socket -> roomId for quick lookup
const socketToRoom = new Map();

const MATCH_TIMEOUT_MS = 30_000; // give up & show "no founders" after this
const RELAX_AFTER_MS = 10_000;   // ignore secondary filters once a peer waited this long

const generateRoomId = () => `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Two users must never be matched if either has blocked the other
const isBlocked = (a, b) =>
  (a.blockedUsers || []).includes(b.userId) || (b.blockedUsers || []).includes(a.userId);

// Does candidate `b` satisfy `a`'s active filters? (one direction)
const passesFilters = (a, b) => {
  const f = a.filters || {};
  if (f.role && b.userProfile.role !== f.role) return false;
  if (f.stage && b.userProfile.stage !== f.stage) return false;
  if (f.language && b.userProfile.language !== f.language) return false;
  if (f.tags?.length) {
    const bTags = b.userProfile.tags || [];
    if (!f.tags.some((t) => bTags.includes(t))) return false;
  }
  return true;
};

// Higher = better match. Tag overlap dominates, then language, then waiting time.
const score = (a, b) => {
  const aTags = a.userProfile.tags || [];
  const bTags = b.userProfile.tags || [];
  const overlap = aTags.filter((t) => bTags.includes(t)).length;
  const sameLang = a.userProfile.language === b.userProfile.language ? 1 : 0;
  return overlap * 100 + sameLang * 10;
};

// Find the best match for `entry`. Returns the matched entry (removed from
// queue) or null. Relaxes filters for peers that have waited too long.
const findMatch = (entry) => {
  const now = Date.now();
  let best = null;
  let bestScore = -1;

  for (const candidate of queue) {
    if (candidate.socketId === entry.socketId) continue;
    if (candidate.userId === entry.userId) continue;
    if (isBlocked(entry, candidate)) continue;

    const relaxed =
      now - candidate.joinedAt > RELAX_AFTER_MS || now - entry.joinedAt > RELAX_AFTER_MS;

    // Respect both users' filters unless we're relaxing for a long wait
    if (!relaxed && (!passesFilters(entry, candidate) || !passesFilters(candidate, entry))) {
      continue;
    }

    const s = relaxed ? 0 : score(entry, candidate);
    // Prefer higher score; tie-break toward the longest-waiting candidate
    if (s > bestScore || (s === bestScore && best && candidate.joinedAt < best.joinedAt)) {
      best = candidate;
      bestScore = s;
    }
  }

  if (best) {
    const idx = queue.indexOf(best);
    if (idx !== -1) queue.splice(idx, 1);
  }
  return best;
};

const joinQueue = (entry) => {
  removeFromQueue(entry.socketId); // no duplicate socket in queue
  queue.push({ ...entry, joinedAt: Date.now() });
};

const removeFromQueue = (socketId) => {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx !== -1) queue.splice(idx, 1);
};

const createRoom = (socketA, socketB) => {
  const roomId = generateRoomId();
  activeRooms.set(roomId, { userA: socketA, userB: socketB });
  socketToRoom.set(socketA, roomId);
  socketToRoom.set(socketB, roomId);
  return roomId;
};

const getRoomForSocket = (socketId) => socketToRoom.get(socketId);

const getPeerSocket = (socketId) => {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const room = activeRooms.get(roomId);
  if (!room) return null;
  return room.userA === socketId ? room.userB : room.userA;
};

const leaveRoom = (socketId) => {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const room = activeRooms.get(roomId);
  const peer = room?.userA === socketId ? room.userB : room.userA;
  activeRooms.delete(roomId);
  socketToRoom.delete(socketId);
  if (peer) socketToRoom.delete(peer);
  return peer;
};

const getQueueLength = () => queue.length;

module.exports = {
  joinQueue,
  removeFromQueue,
  findMatch,
  createRoom,
  getRoomForSocket,
  getPeerSocket,
  leaveRoom,
  getQueueLength,
  MATCH_TIMEOUT_MS,
  RELAX_AFTER_MS,
};

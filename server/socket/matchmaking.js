/**
 * In-memory matchmaking queue.
 * Each entry: { socketId, userId, userProfile, filters, joinedAt }
 */
const queue = [];

// Active rooms: Map<roomId, { userA: socketId, userB: socketId }>
const activeRooms = new Map();

// Map socket -> roomId for quick lookup
const socketToRoom = new Map();

const MATCH_TIMEOUT_MS = 30_000;

const generateRoomId = () => `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Check if two entries are compatible based on optional filters
const isCompatible = (a, b) => {
  const af = a.filters || {};
  const bf = b.filters || {};

  if (af.stage && bf.stage && af.stage !== b.userProfile.stage) return false;
  if (af.sector && bf.sector && af.sector !== b.userProfile.sector) return false;
  if (af.looking_for && bf.looking_for) {
    const aLooking = a.userProfile.looking_for || [];
    const bLooking = b.userProfile.looking_for || [];
    const overlap = aLooking.some((v) => bLooking.includes(v));
    if (!overlap) return false;
  }
  return true;
};

// Try to find a match for a new entry; returns matched entry or null
const findMatch = (entry) => {
  for (let i = 0; i < queue.length; i++) {
    const candidate = queue[i];
    // Skip self
    if (candidate.socketId === entry.socketId) continue;
    // Skip same user logged in twice
    if (candidate.userId === entry.userId) continue;

    if (isCompatible(entry, candidate)) {
      queue.splice(i, 1);
      return candidate;
    }
  }
  return null;
};

const joinQueue = (entry) => {
  // Ensure no duplicate socket in queue
  removeFromQueue(entry.socketId);
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
};

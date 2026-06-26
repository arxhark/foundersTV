const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const { cleanText } = require('../utils/moderation');
const {
  joinQueue,
  removeFromQueue,
  findMatch,
  createRoom,
  getPeerSocket,
  leaveRoom,
  MATCH_TIMEOUT_MS,
} = require('./matchmaking');

// Connected users: Map<socketId, { userId, userProfile, blockedUsers, skips }>
const connectedUsers = new Map();

// Private room membership: Map<roomId, Set<socketId>>
const privateRooms = new Map();

const SKIP_LIMIT = 30;        // max skips
const SKIP_WINDOW_MS = 3_600_000; // per hour

const initSocket = (io, app) => {
  // Authenticate socket connections via JWT cookie or auth token
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        const rawCookie = socket.handshake.headers?.cookie || '';
        const match = rawCookie.match(/(?:^|;\s*)token=([^;]+)/);
        token = match?.[1];
      }
      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-__v');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.name})`);

    connectedUsers.set(socket.id, {
      userId: socket.user._id.toString(),
      userProfile: socket.user.toPublicProfile(),
      blockedUsers: (socket.user.blockedUsers || []).map((id) => id.toString()),
      skips: [], // timestamps of recent skips for rate limiting
    });

    // Personal room for direct notifications (e.g. mutual connection)
    socket.join(`user:${socket.user._id}`);

    app.set('onlineCount', connectedUsers.size);
    io.emit('online-count', connectedUsers.size);

    // Enqueue the current socket and try to pair immediately.
    const enqueueAndMatch = (filters = {}) => {
      const ctx = connectedUsers.get(socket.id);
      if (!ctx) return;

      const entry = {
        socketId: socket.id,
        userId: ctx.userId,
        userProfile: ctx.userProfile,
        blockedUsers: ctx.blockedUsers,
        filters: filters || {},
      };
      joinQueue(entry);

      const matched = findMatch(entry);
      if (matched) {
        const roomId = createRoom(socket.id, matched.socketId);
        const matchedTags = (entry.userProfile.tags || [])
          .filter((t) => (matched.userProfile.tags || []).includes(t));
        // The newcomer (this socket) initiates the WebRTC offer; the waiting
        // peer answers. Assigning roles server-side avoids offer "glare".
        socket.emit('match-found', { roomId, peer: matched.userProfile, tagsMatched: matchedTags, initiator: true });
        io.to(matched.socketId).emit('match-found', { roomId, peer: entry.userProfile, tagsMatched: matchedTags, initiator: false });
      } else {
        socket.emit('waiting');
        clearTimeout(socket._queueTimeout);
        socket._queueTimeout = setTimeout(() => {
          removeFromQueue(socket.id);
          socket.emit('queue-timeout');
        }, MATCH_TIMEOUT_MS);
      }
    };

    // --- Matchmaking ---
    socket.on('join-queue', ({ filters } = {}) => {
      clearTimeout(socket._queueTimeout);
      enqueueAndMatch(filters);
    });

    socket.on('leave-queue', () => {
      clearTimeout(socket._queueTimeout);
      removeFromQueue(socket.id);
    });

    // --- WebRTC signaling (server only relays, never touches media) ---
    socket.on('webrtc-offer', ({ offer }) => {
      const peer = getPeerSocket(socket.id);
      if (peer) io.to(peer).emit('webrtc-offer', { offer });
    });
    socket.on('webrtc-answer', ({ answer }) => {
      const peer = getPeerSocket(socket.id);
      if (peer) io.to(peer).emit('webrtc-answer', { answer });
    });
    socket.on('ice-candidate', ({ candidate }) => {
      const peer = getPeerSocket(socket.id);
      if (peer) io.to(peer).emit('ice-candidate', { candidate });
    });

    // --- Call control ---
    socket.on('next-founder', ({ filters } = {}) => {
      // Rate limit: max SKIP_LIMIT skips per hour per user
      const ctx = connectedUsers.get(socket.id);
      if (ctx) {
        const now = Date.now();
        ctx.skips = ctx.skips.filter((t) => now - t < SKIP_WINDOW_MS);
        if (ctx.skips.length >= SKIP_LIMIT) {
          socket.emit('skip-limit', { retryAfterMs: SKIP_WINDOW_MS - (now - ctx.skips[0]) });
          return;
        }
        ctx.skips.push(now);
      }

      clearTimeout(socket._queueTimeout);
      const peer = leaveRoom(socket.id);
      if (peer) io.to(peer).emit('peer-disconnected');
      enqueueAndMatch(filters);
    });

    socket.on('end-call', () => {
      clearTimeout(socket._queueTimeout);
      removeFromQueue(socket.id);
      const peer = leaveRoom(socket.id);
      if (peer) io.to(peer).emit('peer-disconnected');
    });

    // --- Text chat during call (profanity-filtered) ---
    socket.on('chat-message', ({ message }) => {
      if (!message?.trim()) return;
      const peer = getPeerSocket(socket.id);
      if (peer) {
        io.to(peer).emit('chat-message', {
          message: cleanText(message.slice(0, 500)),
          from: socket.user.name,
          timestamp: Date.now(),
        });
      }
    });

    // --- Live reactions (👏 🔥 🤝 💡) ---
    socket.on('reaction', ({ emoji }) => {
      const allowed = ['👏', '🔥', '🤝', '💡'];
      if (!allowed.includes(emoji)) return;
      const peer = getPeerSocket(socket.id);
      if (peer) io.to(peer).emit('reaction', { emoji });
    });

    // --- Private rooms (mesh, up to 4 participants) ---
    const leavePrivateRoom = () => {
      const roomId = socket._privateRoom;
      if (!roomId) return;
      const members = privateRooms.get(roomId);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) privateRooms.delete(roomId);
      }
      socket.leave(`private:${roomId}`);
      socket.to(`private:${roomId}`).emit('room:peer-left', { socketId: socket.id });
      socket._privateRoom = null;
    };

    socket.on('room:join', ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') return;
      const members = privateRooms.get(roomId) || new Set();
      if (members.size >= 4) return socket.emit('room:full');

      socket._privateRoom = roomId;
      members.add(socket.id);
      privateRooms.set(roomId, members);
      socket.join(`private:${roomId}`);

      // Send the newcomer the list of existing peers (with profiles)
      const peers = [...members]
        .filter((id) => id !== socket.id)
        .map((id) => ({ socketId: id, profile: connectedUsers.get(id)?.userProfile }));
      socket.emit('room:peers', { peers, self: socket.id });

      // Tell existing peers about the newcomer
      socket.to(`private:${roomId}`).emit('room:peer-joined', {
        socketId: socket.id,
        profile: connectedUsers.get(socket.id)?.userProfile,
      });

      Room.findOneAndUpdate({ roomId }, { lastActivityAt: new Date() }).catch(() => {});
    });

    // Mesh signaling: relay directly to a specific peer socket
    socket.on('room:signal', ({ to, data }) => {
      if (to) io.to(to).emit('room:signal', { from: socket.id, data });
    });

    socket.on('room:leave', leavePrivateRoom);

    // --- Stats on call end ---
    socket.on('call-ended', async ({ durationSeconds }) => {
      if (durationSeconds > 0) {
        await User.findByIdAndUpdate(socket.user._id, {
          $inc: {
            'stats.totalConnections': 1,
            'stats.totalMinutes': Math.floor(durationSeconds / 60),
            sessionsCount: 1,
          },
        }).catch(() => {});
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      clearTimeout(socket._queueTimeout);
      removeFromQueue(socket.id);
      const peer = leaveRoom(socket.id);
      if (peer) io.to(peer).emit('peer-disconnected');
      leavePrivateRoom();

      connectedUsers.delete(socket.id);
      app.set('onlineCount', connectedUsers.size);
      io.emit('online-count', connectedUsers.size);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;

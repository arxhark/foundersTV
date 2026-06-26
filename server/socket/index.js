const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  joinQueue,
  removeFromQueue,
  findMatch,
  createRoom,
  getPeerSocket,
  leaveRoom,
  MATCH_TIMEOUT_MS,
} = require('./matchmaking');

// Connected users: Map<socketId, { userId, userProfile, blockedUsers }>
const connectedUsers = new Map();

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
    });

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

    // --- Text chat during call ---
    socket.on('chat-message', ({ message }) => {
      if (!message?.trim()) return;
      const peer = getPeerSocket(socket.id);
      if (peer) {
        io.to(peer).emit('chat-message', {
          message: message.slice(0, 500),
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

      connectedUsers.delete(socket.id);
      app.set('onlineCount', connectedUsers.size);
      io.emit('online-count', connectedUsers.size);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;

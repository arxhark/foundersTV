const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  joinQueue,
  removeFromQueue,
  findMatch,
  createRoom,
  getPeerSocket,
  leaveRoom,
  getQueueLength,
  MATCH_TIMEOUT_MS,
} = require('./matchmaking');

// Connected users: Map<socketId, { userId, userProfile }>
const connectedUsers = new Map();

const initSocket = (io, app) => {
  // Authenticate socket connections via JWT cookie or query token
  io.use(async (socket, next) => {
    try {
      // Try auth object first, then cookie header (httpOnly cookies are sent automatically)
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
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.name})`);

    connectedUsers.set(socket.id, {
      userId: socket.user._id.toString(),
      userProfile: {
        _id: socket.user._id,
        name: socket.user.name,
        photo: socket.user.photo,
        country: socket.user.country,
        startup: socket.user.startup,
        stage: socket.user.stage,
        sector: socket.user.sector,
        looking_for: socket.user.looking_for,
        linkedin: socket.user.linkedin,
      },
    });

    // Broadcast updated online count
    app.set('onlineCount', connectedUsers.size);
    io.emit('online-count', connectedUsers.size);

    // --- Matchmaking ---
    socket.on('join-queue', ({ filters } = {}) => {
      const { userId, userProfile } = connectedUsers.get(socket.id) || {};
      if (!userId) return;

      const entry = { socketId: socket.id, userId, userProfile, filters: filters || {} };
      joinQueue(entry);

      // Attempt immediate match
      const matched = findMatch(entry);
      if (matched) {
        const roomId = createRoom(socket.id, matched.socketId);

        socket.emit('match-found', { roomId, peer: matched.userProfile });
        io.to(matched.socketId).emit('match-found', { roomId, peer: userProfile });
      } else {
        socket.emit('waiting');

        // Timeout if no match within 30 seconds
        socket._queueTimeout = setTimeout(() => {
          removeFromQueue(socket.id);
          socket.emit('queue-timeout');
        }, MATCH_TIMEOUT_MS);
      }
    });

    socket.on('leave-queue', () => {
      clearTimeout(socket._queueTimeout);
      removeFromQueue(socket.id);
    });

    // --- WebRTC Signaling ---
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
    socket.on('next-founder', () => {
      clearTimeout(socket._queueTimeout);
      const peer = leaveRoom(socket.id);
      if (peer) io.to(peer).emit('peer-disconnected');

      // Re-enqueue current user
      const entry = connectedUsers.get(socket.id);
      if (entry) {
        joinQueue({ socketId: socket.id, ...entry, filters: {} });
        const matched = findMatch({ socketId: socket.id, ...entry, filters: {} });

        if (matched) {
          const roomId = createRoom(socket.id, matched.socketId);
          socket.emit('match-found', { roomId, peer: matched.userProfile });
          io.to(matched.socketId).emit('match-found', { roomId, peer: entry.userProfile });
        } else {
          socket.emit('waiting');
          socket._queueTimeout = setTimeout(() => {
            removeFromQueue(socket.id);
            socket.emit('queue-timeout');
          }, MATCH_TIMEOUT_MS);
        }
      }
    });

    socket.on('end-call', () => {
      clearTimeout(socket._queueTimeout);
      removeFromQueue(socket.id);
      const peer = leaveRoom(socket.id);
      if (peer) io.to(peer).emit('peer-disconnected');
    });

    // --- Chat ---
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

    // --- Call duration tracking ---
    socket.on('call-ended', async ({ durationSeconds }) => {
      if (durationSeconds > 0) {
        await User.findByIdAndUpdate(socket.user._id, {
          $inc: {
            'stats.totalConnections': 1,
            'stats.totalMinutes': Math.floor(durationSeconds / 60),
          },
        });
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

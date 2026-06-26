require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const passport = require('./config/passport');
const initSocket = require('./socket');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// ── Allowed origins ────────────────────────────────────────────────────────────
// CLIENT_URL can be a comma-separated list for multiple Vercel preview URLs
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

const isAllowed = (origin) => {
  if (!origin) return false; // block requests with no origin (curl, Postman) in production
  return allowedOrigins.some(allowed => {
    // Support wildcard subdomains: https://*.vercel.app
    if (allowed.includes('*')) {
      const pattern = new RegExp('^' + allowed.replace('*', '[^.]+') + '$');
      return pattern.test(origin);
    }
    return allowed === origin;
  });
};

const corsOptions = {
  origin: (origin, cb) => {
    // In development allow any origin for local testing
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    if (isAllowed(origin)) return cb(null, true);
    cb(Object.assign(new Error('CORS: origin not allowed'), { status: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // needed for Cloudinary images
}));

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Global: 200 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}));

// Auth routes: stricter — 20 attempts per 15 min (prevents OAuth abuse)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, try again later.' },
});

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 for unknown API routes
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status !== 403 && status !== 404) console.error(err);
  res.status(status).json({ error: message });
});

// ── Socket.io ──────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (process.env.NODE_ENV !== 'production') return cb(null, true);
      if (isAllowed(origin)) return cb(null, true);
      cb(new Error('Socket CORS: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

initSocket(io, app);

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`FoundersTV server running on port ${PORT} — allowed origins: ${allowedOrigins.join(', ')}`);
  });
});

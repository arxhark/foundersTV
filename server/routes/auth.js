const express = require('express');
const passport = require('passport');
const {
  oauthCallback,
  requestMagicLink,
  verifyMagicLink,
  getMe,
  logout,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

// Reports which providers are actually configured, so the client can
// show/hide login buttons accordingly.
router.get('/providers', (req, res) => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY),
    email: true,
  });
});

// ── Google ─────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect(`${CLIENT_URL}/auth?error=google_disabled`);
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/auth?error=oauth` }),
  oauthCallback
);

// ── Apple ──────────────────────────────────────────────────────────
router.get('/apple', (req, res, next) => {
  if (!process.env.APPLE_CLIENT_ID) return res.redirect(`${CLIENT_URL}/auth?error=apple_disabled`);
  passport.authenticate('apple', { session: false })(req, res, next);
});
// Apple posts back form-encoded data to the callback
router.post(
  '/apple/callback',
  express.urlencoded({ extended: true }),
  passport.authenticate('apple', { session: false, failureRedirect: `${CLIENT_URL}/auth?error=oauth` }),
  oauthCallback
);

// ── Email magic link ───────────────────────────────────────────────
router.post('/magic/request', requestMagicLink);
router.get('/magic/verify', verifyMagicLink);

// ── Session ────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;

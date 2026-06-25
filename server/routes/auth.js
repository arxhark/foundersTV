const express = require('express');
const passport = require('passport');
const { googleCallback, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Initiate Google OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=oauth` }),
  googleCallback
);

// Get current authenticated user
router.get('/me', authenticate, getMe);

// Logout
router.post('/logout', authenticate, logout);

module.exports = router;

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMagicLink } = require('../utils/email');

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Sets the auth cookie used by both REST middleware and Socket.io
const setAuthCookie = (res, user) => {
  const token = generateToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
};

const postLoginRedirect = (user) =>
  user.onboardingComplete ? `${CLIENT_URL}/dashboard` : `${CLIENT_URL}/onboarding`;

// ── OAuth callbacks (Passport) ─────────────────────────────────────
const oauthCallback = (req, res) => {
  try {
    setAuthCookie(res, req.user);
    res.redirect(postLoginRedirect(req.user));
  } catch {
    res.redirect(`${CLIENT_URL}/auth?error=server`);
  }
};

// ── Email magic link ───────────────────────────────────────────────
const requestMagicLink = async (req, res) => {
  try {
    const email = req.body?.email?.toLowerCase().trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        authProvider: 'email',
        name: email.split('@')[0],
        onboardingComplete: false,
      });
    }

    // Short-lived, single-purpose token embedded in the link
    const magicToken = jwt.sign(
      { id: user._id, purpose: 'magic' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const link = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/magic/verify?token=${magicToken}`;

    const result = await sendMagicLink(email, link);
    // In dev (no email provider) return the link so the flow is testable
    res.json({ message: 'Magic link sent', ...(result.delivered ? {} : { devLink: result.link }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'magic') throw new Error('Invalid token purpose');

    const user = await User.findById(decoded.id);
    if (!user) throw new Error('User not found');

    user.emailVerified = true;
    await user.save();

    setAuthCookie(res, user);
    res.redirect(postLoginRedirect(user));
  } catch {
    res.redirect(`${CLIENT_URL}/auth?error=link`);
  }
};

// ── Session ────────────────────────────────────────────────────────
const getMe = async (req, res) => res.json(req.user);

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

module.exports = { oauthCallback, requestMagicLink, verifyMagicLink, getMe, logout };

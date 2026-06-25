const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

const setCookieAndRespond = (res, user) => {
  const token = generateToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
};

// Called by Passport after Google OAuth success
const googleCallback = async (req, res) => {
  try {
    const token = setCookieAndRespond(res, req.user);
    const redirectUrl = req.user.onboardingComplete
      ? `${process.env.CLIENT_URL}/dashboard`
      : `${process.env.CLIENT_URL}/onboarding`;
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/auth?error=server`);
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

module.exports = { googleCallback, getMe, logout };

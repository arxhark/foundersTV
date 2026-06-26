const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// ── Google ─────────────────────────────────────────────────────────
// Only register the strategy when credentials are present so the server
// can still boot (and serve other routes) before OAuth is configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (!user) {
            user = await User.create({
              googleId: profile.id,
              authProvider: 'google',
              email,
              emailVerified: true,
              name: profile.displayName,
              photo: profile.photos?.[0]?.value || '',
              onboardingComplete: false,
            });
          } else if (!user.googleId) {
            // Link Google to an existing email/apple account
            user.googleId = profile.id;
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log('Auth: Google strategy enabled');
} else {
  console.warn('Auth: Google strategy DISABLED (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
}

// ── Apple ──────────────────────────────────────────────────────────
// Requires a paid Apple Developer account: a Service ID, a private key (.p8),
// the Team ID and Key ID. Scaffolded here; activates automatically once the
// APPLE_* env vars are provided.
if (
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY
) {
  // eslint-disable-next-line global-require
  const AppleStrategy = require('passport-apple');
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        // The .p8 contents; newlines may be escaped in the env var
        privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        callbackURL: `${SERVER_URL}/api/auth/apple/callback`,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
          // Apple returns the user's email only on first authorization
          const appleId = idToken.sub;
          const email = (idToken.email || `${appleId}@privaterelay.appleid.com`).toLowerCase();
          let user = await User.findOne({ $or: [{ appleId }, { email }] });

          if (!user) {
            // Name arrives once, in req.body.user as JSON, on first sign-in
            let name = 'Founder';
            try {
              if (req.body?.user) {
                const parsed = JSON.parse(req.body.user);
                name = `${parsed.name?.firstName || ''} ${parsed.name?.lastName || ''}`.trim() || name;
              }
            } catch { /* ignore malformed name payload */ }

            user = await User.create({
              appleId,
              authProvider: 'apple',
              email,
              emailVerified: true,
              name,
              onboardingComplete: false,
            });
          } else if (!user.appleId) {
            user.appleId = appleId;
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log('Auth: Apple strategy enabled');
} else {
  console.warn('Auth: Apple strategy DISABLED (missing APPLE_* credentials — requires paid Apple Developer account)');
}

module.exports = passport;

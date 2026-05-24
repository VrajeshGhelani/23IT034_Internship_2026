const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password').lean();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Only register Google strategy if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            return done(null, user);
          }

          // 2. Check if user exists with same email — link Google account
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value.toLowerCase()
              : null;

          if (email) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatar && profile.photos && profile.photos.length > 0) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
              return done(null, user);
            }
          }

          // 3. Create new user
          user = await User.create({
            name: profile.displayName || 'Google User',
            email: email || `${profile.id}@google.oauth`,
            googleId: profile.id,
            avatar:
              profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : '',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy registered');
} else {
  console.log('⚠️  Google OAuth not configured — skipping Google strategy (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env)');
}

module.exports = passport;

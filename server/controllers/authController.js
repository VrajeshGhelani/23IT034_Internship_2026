const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // If user signed up via Google only, they have no password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google sign-in. Please use "Continue with Google".',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Get current user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc   Google OAuth initiation
// @route  GET /api/auth/google
// @access Public
const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

// @desc   Google OAuth callback
// @route  GET /api/auth/google/callback
// @access Public
const googleCallback = [
  passport.authenticate('google', {
    session: false,
    failureRedirect: (process.env.CLIENT_URL || 'http://localhost:5173') + '/login?error=google',
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

      // Use an HTML trampoline page instead of res.redirect().
      // res.redirect() can break if CLIENT_URL is malformed (no protocol) —
      // the browser treats it as a relative path causing URL concatenation.
      // This HTML page uses window.location.replace() which handles URLs
      // more reliably. The token is passed via ?token= in the URL so the
      // frontend DashboardPage can read it from its own domain's URL and
      // save it to its own localStorage.
      // NOTE: We do NOT use localStorage.setItem() here because this HTML
      // is served from the backend domain (e.g. localhost:5000) which is a
      // different origin from the frontend (e.g. localhost:5173), and
      // localStorage is domain-scoped.
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Signing you in...</title>
          </head>
          <body>
            <p style="font-family:sans-serif;text-align:center;margin-top:40px">
              Signing you in, please wait...
            </p>
            <script>
              window.location.replace('${clientUrl}/dashboard?token=${token}');
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
      res.redirect(clientUrl + '/login?error=google');
    }
  },
];

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { register, login, getMe, googleAuth, googleCallback, registerValidation, loginValidation };

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

// Sanitize CLIENT_URL: trim, strip trailing slash, ensure protocol
const getClientUrl = () => {
  let url = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
};

const googleCallback = [
  passport.authenticate('google', {
    session: false,
    failureRedirect: getClientUrl() + '/login?error=google',
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const clientUrl = getClientUrl();
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Logging in...</title></head>
          <body>
            <script>
              localStorage.setItem('token', '${token}');
              window.location.href = '${clientUrl}/dashboard';
            </script>
            <p>Logging you in, please wait...</p>
          </body>
        </html>
      `);
    } catch (err) {
      res.redirect(getClientUrl() + '/login?error=google');
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

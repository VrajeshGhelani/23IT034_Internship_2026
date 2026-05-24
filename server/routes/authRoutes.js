const express = require('express');
const router = express.Router();
const {
  register, login, getMe, googleAuth, googleCallback, registerValidation, loginValidation,
} = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', verifyJWT, getMe);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', ...googleCallback);

module.exports = router;

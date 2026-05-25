const express = require('express');
const router = express.Router({ mergeParams: true });
const { getMessages, markAsRead, getUnreadCount } = require('../controllers/chatController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

// GET /api/groups/:id/messages?page=1&limit=30
router.get('/', getMessages);

// POST /api/groups/:id/messages/read
router.post('/read', markAsRead);

// GET /api/groups/:id/messages/unread-count
router.get('/unread-count', getUnreadCount);

module.exports = router;

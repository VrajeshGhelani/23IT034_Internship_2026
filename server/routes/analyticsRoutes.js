const express = require('express');
const router = express.Router({ mergeParams: true });
const { getGroupAnalytics } = require('../controllers/analyticsController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

// GET /api/groups/:id/analytics?range=all
router.get('/', getGroupAnalytics);

module.exports = router;

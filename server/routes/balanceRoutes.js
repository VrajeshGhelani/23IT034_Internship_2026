const express = require('express');
const router = express.Router({ mergeParams: true });
const { getBalances, getSettleUp, recordSettlement, getDashboard } = require('../controllers/balanceController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

router.get('/balances', getBalances);
router.get('/settleup', getSettleUp);
router.post('/settle', recordSettlement);

module.exports = router;

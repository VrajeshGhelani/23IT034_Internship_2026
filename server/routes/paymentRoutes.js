const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.use(verifyJWT);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/status', paymentController.getSubscriptionStatus);
router.post('/cancel', paymentController.cancelSubscription);

module.exports = router;

const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const User = require('../models/User');
const crypto = require('crypto');

exports.createOrder = async (req, res) => {
  try {
    const { billingCycle } = req.body;
    const amount = billingCycle === 'yearly' ? 79900 : 9900;
    
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
      notes: { userId: req.user._id.toString(), billingCycle }
    });

    await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      amount,
      billingCycle
    });

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    await User.findByIdAndUpdate(req.user._id, {
      subscription: {
        plan: 'premium',
        status: 'active',
        startDate,
        endDate,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        billingCycle
      }
    });

    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid'
      }
    );

    res.json({ success: true, message: 'Payment successful! Premium activated.' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      isPremium: user.isPremium(),
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      'subscription.status': 'expired'
    });
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

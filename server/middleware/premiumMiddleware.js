const User = require('../models/User');

const requirePremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isPremium()) {
      return res.status(403).json({
        success: false,
        message: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED'
      });
    }
    next();
  } catch (error) {
    console.error('Premium middleware error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { requirePremium };

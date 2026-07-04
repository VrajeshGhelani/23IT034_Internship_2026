const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
      },
      status: {
        type: String,
        enum: ['inactive', 'active', 'expired'],
        default: 'inactive'
      },
      startDate: Date,
      endDate: Date,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      }
    }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.isPremium = function() {
  return (
    this.subscription &&
    this.subscription.plan === 'premium' &&
    this.subscription.status === 'active' &&
    this.subscription.endDate && 
    this.subscription.endDate > new Date()
  );
};

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');

const SplitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Split amount cannot be negative'],
    },
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage', 'shares'],
      required: [true, 'Split type is required'],
    },
    splits: {
      type: [SplitSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one split is required',
      },
    },
    category: {
      type: String,
      enum: ['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Other'],
      default: 'Other',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receipt: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', ExpenseSchema);

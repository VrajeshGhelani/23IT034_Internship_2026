const { validationResult, body } = require('express-validator');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const cloudinary = require('../config/cloudinary');

/**
 * Compute splits based on splitType and return array of {user, amount}
 */
const computeSplits = (splitType, amount, members, rawSplits) => {
  const EPSILON = 0.01;

  if (splitType === 'equal') {
    const share = Math.round((amount / members.length) * 100) / 100;
    // give remainder to first member
    const remainder = Math.round((amount - share * members.length) * 100) / 100;
    return members.map((userId, i) => ({
      user: userId,
      amount: i === 0 ? share + remainder : share,
    }));
  }

  if (splitType === 'exact') {
    const total = rawSplits.reduce((s, r) => s + r.amount, 0);
    if (Math.abs(total - amount) > EPSILON) {
      throw { statusCode: 400, message: `Exact splits sum (${total.toFixed(2)}) must equal total amount (${amount.toFixed(2)})` };
    }
    return rawSplits.map((r) => ({ user: r.user, amount: r.amount }));
  }

  if (splitType === 'percentage') {
    const totalPct = rawSplits.reduce((s, r) => s + r.value, 0);
    if (Math.abs(totalPct - 100) > EPSILON) {
      throw { statusCode: 400, message: `Percentages must sum to 100. Got ${totalPct.toFixed(2)}` };
    }
    return rawSplits.map((r) => ({
      user: r.user,
      amount: Math.round(((r.value / 100) * amount) * 100) / 100,
    }));
  }

  if (splitType === 'shares') {
    const totalShares = rawSplits.reduce((s, r) => s + r.value, 0);
    if (totalShares <= 0) {
      throw { statusCode: 400, message: 'Total shares must be greater than 0' };
    }
    return rawSplits.map((r) => ({
      user: r.user,
      amount: Math.round(((r.value / totalShares) * amount) * 100) / 100,
    }));
  }

  throw { statusCode: 400, message: 'Invalid split type' };
};

// @desc   Add expense to group (with optional receipt via FormData)
// @route  POST /api/groups/:id/expenses
// @access Private
const addExpense = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    // Parse body — may be FormData fields (strings) or JSON
    let { title, amount, paidBy, splitType, splits: rawSplits, category, date } = req.body;

    // When sent via FormData, splits comes as a JSON string
    if (typeof rawSplits === 'string') {
      try {
        rawSplits = JSON.parse(rawSplits);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid splits data' });
      }
    }

    amount = parseFloat(amount);
    if (!title || isNaN(amount) || amount <= 0 || !paidBy || !splitType) {
      return res.status(400).json({ success: false, message: 'Title, amount, paidBy, and splitType are required' });
    }

    // Validate paidBy is a group member
    if (!group.members.map(String).includes(paidBy)) {
      return res.status(400).json({ success: false, message: 'paidBy user must be a group member' });
    }

    let splits;
    try {
      if (splitType === 'equal') {
        const memberIds = rawSplits && rawSplits.length > 0 ? rawSplits.map((r) => r.user) : group.members.map(String);
        splits = computeSplits(splitType, amount, memberIds, []);
      } else {
        splits = computeSplits(splitType, amount, [], rawSplits);
      }
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }

    // Build receipt data from uploaded file
    let receipt = {};
    if (req.file) {
      receipt = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    const expense = await Expense.create({
      group: req.params.id,
      title,
      amount,
      paidBy,
      splitType,
      splits,
      category: category || 'Other',
      date: date || Date.now(),
      createdBy: req.user._id,
      receipt,
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .lean();

    res.status(201).json({ success: true, expense: populated });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all expenses for a group
// @route  GET /api/groups/:id/expenses
// @access Private
const getExpenses = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id }).lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, expenses });
  } catch (err) {
    next(err);
  }
};

// @desc   Edit expense
// @route  PUT /api/expenses/:id
// @access Private (creator or group creator)
const updateExpense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isAdmin = group.createdBy.toString() === req.user._id.toString();
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this expense' });
    }

    let { title, amount, paidBy, splitType, splits: rawSplits, category, date } = req.body;

    // When sent via FormData, splits comes as a JSON string
    if (typeof rawSplits === 'string') {
      try {
        rawSplits = JSON.parse(rawSplits);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid splits data' });
      }
    }

    const finalAmount = amount !== undefined && !isNaN(parseFloat(amount)) ? parseFloat(amount) : expense.amount;
    const finalSplitType = splitType || expense.splitType;

    let splits;
    try {
      if (finalSplitType === 'equal') {
        const memberIds = rawSplits && rawSplits.length > 0 ? rawSplits.map((r) => r.user) : group.members.map(String);
        splits = computeSplits(finalSplitType, finalAmount, memberIds, []);
      } else {
        splits = computeSplits(finalSplitType, finalAmount, [], rawSplits || expense.splits);
      }
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }

    expense.title = title || expense.title;
    expense.amount = finalAmount;
    expense.paidBy = paidBy || expense.paidBy;
    expense.splitType = finalSplitType;
    expense.splits = splits;
    expense.category = category || expense.category;
    expense.date = date || expense.date;

    // Handle receipt file upload if present
    if (req.file) {
      if (expense.receipt && expense.receipt.publicId) {
        try {
          await cloudinary.uploader.destroy(expense.receipt.publicId);
        } catch (cloudErr) {
          console.error('Failed to delete old receipt from Cloudinary:', cloudErr.message);
        }
      }
      expense.receipt = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .lean();

    res.json({ success: true, expense: populated });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete expense (with Cloudinary cleanup)
// @route  DELETE /api/expenses/:id
// @access Private (creator or group creator)
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isAdmin = group.createdBy.toString() === req.user._id.toString();
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    // Clean up receipt from Cloudinary
    if (expense.receipt && expense.receipt.publicId) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(expense.receipt.publicId);
      } catch (cloudErr) {
        console.error('Failed to delete receipt from Cloudinary:', cloudErr.message);
      }
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc   Replace receipt on an expense
// @route  PUT /api/expenses/:id/receipt
// @access Private (creator or group creator)
const replaceReceipt = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isAdmin = group.createdBy.toString() === req.user._id.toString();
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this expense' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt file provided' });
    }

    // Destroy old receipt if exists
    if (expense.receipt && expense.receipt.publicId) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(expense.receipt.publicId);
      } catch (cloudErr) {
        console.error('Failed to delete old receipt from Cloudinary:', cloudErr.message);
      }
    }

    expense.receipt = {
      url: req.file.path,
      publicId: req.file.filename,
    };
    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .lean();

    res.json({ success: true, expense: populated });
  } catch (err) {
    next(err);
  }
};

const expenseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('paidBy').notEmpty().withMessage('paidBy is required'),
  body('splitType').isIn(['equal', 'exact', 'percentage', 'shares']).withMessage('Invalid split type'),
];

module.exports = { addExpense, getExpenses, updateExpense, deleteExpense, replaceReceipt, expenseValidation, computeSplits };

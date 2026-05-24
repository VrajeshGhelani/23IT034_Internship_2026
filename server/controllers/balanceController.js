const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const settleUpAlgorithm = require('../utils/settleUpAlgorithm');

/**
 * Compute net balances for a group given its expenses and settlements.
 * Returns { userId -> netBalance }
 * positive = user is owed money
 * negative = user owes money
 */
const computeGroupBalances = async (groupId) => {
  const expenses = await Expense.find({ group: groupId }).lean();
  const settlements = await Settlement.find({ group: groupId }).lean();

  const balances = {};

  for (const expense of expenses) {
    const paidByStr = expense.paidBy.toString();
    // paidBy gets credit for what they paid
    balances[paidByStr] = (balances[paidByStr] || 0) + expense.amount;

    // each split member owes their share
    for (const split of expense.splits) {
      const userStr = split.user.toString();
      balances[userStr] = (balances[userStr] || 0) - split.amount;
    }
  }

  // Apply settlements
  for (const settlement of settlements) {
    const fromStr = settlement.paidBy.toString();
    const toStr = settlement.paidTo.toString();
    balances[fromStr] = (balances[fromStr] || 0) + settlement.amount;
    balances[toStr] = (balances[toStr] || 0) - settlement.amount;
  }

  return balances;
};

// @desc   Get balances for a group
// @route  GET /api/groups/:id/balances
// @access Private
const getBalances = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id })
      .populate('members', 'name email avatar')
      .lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    const rawBalances = await computeGroupBalances(req.params.id);

    const balances = group.members.map((member) => ({
      user: member,
      netBalance: Math.round((rawBalances[member._id.toString()] || 0) * 100) / 100,
    }));

    res.json({ success: true, balances });
  } catch (err) {
    next(err);
  }
};

// @desc   Get settle-up transactions for a group
// @route  GET /api/groups/:id/settleup
// @access Private
const getSettleUp = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id })
      .populate('members', 'name email avatar')
      .lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    const rawBalances = await computeGroupBalances(req.params.id);

    const balanceArray = group.members.map((member) => ({
      userId: member._id.toString(),
      netBalance: Math.round((rawBalances[member._id.toString()] || 0) * 100) / 100,
    }));

    const transactions = settleUpAlgorithm(balanceArray);

    // Populate user info in transactions
    const memberMap = {};
    for (const m of group.members) {
      memberMap[m._id.toString()] = m;
    }

    const populatedTransactions = transactions.map((t) => ({
      from: memberMap[t.from] || { _id: t.from },
      to: memberMap[t.to] || { _id: t.to },
      amount: t.amount,
    }));

    res.json({ success: true, transactions: populatedTransactions });
  } catch (err) {
    next(err);
  }
};

// @desc   Record a settlement
// @route  POST /api/groups/:id/settle
// @access Private
const recordSettlement = async (req, res, next) => {
  try {
    const { paidTo, amount, note } = req.body;

    if (!paidTo || !amount) {
      return res.status(400).json({ success: false, message: 'paidTo and amount are required' });
    }

    const group = await Group.findOne({ _id: req.params.id, members: req.user._id }).lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    const settlement = await Settlement.create({
      group: req.params.id,
      paidBy: req.user._id,
      paidTo,
      amount,
      note: note || '',
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name email avatar')
      .populate('paidTo', 'name email avatar')
      .lean();

    res.status(201).json({ success: true, settlement: populated });
  } catch (err) {
    next(err);
  }
};

// @desc   Dashboard cross-group summary
// @route  GET /api/dashboard
// @access Private
const getDashboard = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();

    const userId = req.user._id.toString();
    let totalOwe = 0;
    let totalOwed = 0;
    const groupSummaries = [];

    for (const group of groups) {
      const rawBalances = await computeGroupBalances(group._id);
      const myBalance = Math.round((rawBalances[userId] || 0) * 100) / 100;

      if (myBalance < 0) totalOwe += Math.abs(myBalance);
      if (myBalance > 0) totalOwed += myBalance;

      groupSummaries.push({
        group,
        myBalance,
      });
    }

    res.json({
      success: true,
      summary: {
        totalOwe: Math.round(totalOwe * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        groups: groupSummaries,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBalances, getSettleUp, recordSettlement, getDashboard };

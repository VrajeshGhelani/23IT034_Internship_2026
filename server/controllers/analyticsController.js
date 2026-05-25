const mongoose = require('mongoose');
const Group = require('../models/Group');
const Expense = require('../models/Expense');

// Simple in-memory cache (Map) to avoid hammering MongoDB on every tab switch
const analyticsCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

const getCachedOrFetch = async (cacheKey, fetchFn) => {
  const cached = analyticsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  analyticsCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Helper to parse date range query param into a Date
const getDateFilter = (range) => {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3m':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6m':
      return new Date(now.setMonth(now.getMonth() - 6));
    case 'all':
    default:
      return null;
  }
};

// Build analytics data from expenses
const buildAnalytics = async (matchFilter, groupMembers) => {
  const expenses = await Expense.find(matchFilter)
    .populate('paidBy', 'name avatar')
    .sort({ date: -1 })
    .lean();

  if (expenses.length === 0) {
    return {
      totalExpenses: 0,
      totalAmount: 0,
      avgExpenseAmount: 0,
      mostExpensiveCategory: 'N/A',
      topSpender: { name: 'N/A', amount: 0 },
      mostActiveMonth: 'N/A',
      categoryBreakdown: [],
      monthlyTrend: [],
      memberSpending: [],
      expensesByDay: [],
      splitTypeUsage: [],
      recentActivity: [],
    };
  }

  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgExpenseAmount = Math.round((totalAmount / totalExpenses) * 100) / 100;

  // Category breakdown
  const categoryMap = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, total: 0, count: 0 };
    }
    categoryMap[cat].total += e.amount;
    categoryMap[cat].count += 1;
  });
  const categoryBreakdown = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      total: Math.round(c.total * 100) / 100,
      percentage: Math.round((c.total / totalAmount) * 10000) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  const mostExpensiveCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'N/A';

  // Top spender
  const spenderMap = {};
  expenses.forEach((e) => {
    const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
    const payerName = e.paidBy.name || 'Unknown';
    if (!spenderMap[payerId]) {
      spenderMap[payerId] = { name: payerName, amount: 0 };
    }
    spenderMap[payerId].amount += e.amount;
  });
  const spenders = Object.values(spenderMap).sort((a, b) => b.amount - a.amount);
  const topSpender = spenders.length > 0
    ? { name: spenders[0].name, amount: Math.round(spenders[0].amount * 100) / 100 }
    : { name: 'N/A', amount: 0 };

  // Monthly trend (last 6 months)
  const monthMap = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthMap[key] = { month: label, total: 0, count: 0, sortKey: key };
  }

  expenses.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      monthMap[key].total += e.amount;
      monthMap[key].count += 1;
    }
  });
  const monthlyTrend = Object.values(monthMap)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ month, total, count }) => ({
      month,
      total: Math.round(total * 100) / 100,
      count,
    }));

  // Most active month
  const allMonthEntries = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    allMonthEntries[label] = (allMonthEntries[label] || 0) + 1;
  });
  const mostActiveMonth = Object.entries(allMonthEntries).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Member spending
  const memberPaid = {};
  const memberOwes = {};

  expenses.forEach((e) => {
    const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
    memberPaid[payerId] = (memberPaid[payerId] || 0) + e.amount;

    if (e.splits) {
      e.splits.forEach((s) => {
        const uid = s.user.toString();
        memberOwes[uid] = (memberOwes[uid] || 0) + s.amount;
      });
    }
  });

  const memberSpending = (groupMembers || []).map((m) => {
    const memberId = m._id.toString();
    const paid = Math.round((memberPaid[memberId] || 0) * 100) / 100;
    const owes = Math.round((memberOwes[memberId] || 0) * 100) / 100;
    return {
      name: m.name,
      paid,
      owes,
      netBalance: Math.round((paid - owes) * 100) / 100,
    };
  });

  // Expenses by day (last 30 days)
  const dayMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap[key] = { date: key, total: 0 };
  }

  expenses.forEach((e) => {
    const key = new Date(e.date).toISOString().split('T')[0];
    if (dayMap[key]) {
      dayMap[key].total += e.amount;
    }
  });
  const expensesByDay = Object.values(dayMap).map((d) => ({
    ...d,
    total: Math.round(d.total * 100) / 100,
  }));

  // Split type usage
  const splitMap = {};
  expenses.forEach((e) => {
    const type = e.splitType || 'equal';
    splitMap[type] = (splitMap[type] || 0) + 1;
  });
  const splitTypeUsage = Object.entries(splitMap).map(([type, count]) => ({ type, count }));

  // Recent activity (last 5)
  const recentActivity = expenses.slice(0, 5).map((e) => ({
    title: e.title,
    amount: e.amount,
    paidBy: e.paidBy.name || 'Unknown',
    category: e.category || 'Other',
    date: e.date,
  }));

  return {
    totalExpenses,
    totalAmount: Math.round(totalAmount * 100) / 100,
    avgExpenseAmount,
    mostExpensiveCategory,
    topSpender,
    mostActiveMonth,
    categoryBreakdown,
    monthlyTrend,
    memberSpending,
    expensesByDay,
    splitTypeUsage,
    recentActivity,
  };
};

// @desc   Get analytics for a specific group
// @route  GET /api/groups/:id/analytics?range=all
// @access Private (must be group member)
const getGroupAnalytics = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const range = req.query.range || 'all';

    // Verify user is a group member
    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    })
      .populate('members', 'name email avatar')
      .lean();

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: 'Group not found or access denied' });
    }

    const cacheKey = `group:${groupId}:${range}`;

    const analytics = await getCachedOrFetch(cacheKey, async () => {
      const matchFilter = { group: new mongoose.Types.ObjectId(groupId) };
      const dateFrom = getDateFilter(range);
      if (dateFrom) {
        matchFilter.date = { $gte: dateFrom };
      }
      return buildAnalytics(matchFilter, group.members);
    });

    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
};

// @desc   Get dashboard analytics across all groups user is a member of
// @route  GET /api/dashboard/analytics?range=all
// @access Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const range = req.query.range || 'all';

    const groups = await Group.find({ members: userId })
      .populate('members', 'name email avatar')
      .lean();

    if (groups.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalExpenses: 0,
          totalAmount: 0,
          avgExpenseAmount: 0,
          mostExpensiveCategory: 'N/A',
          topSpender: { name: 'N/A', amount: 0 },
          mostActiveMonth: 'N/A',
          categoryBreakdown: [],
          monthlyTrend: [],
          memberSpending: [],
          expensesByDay: [],
          splitTypeUsage: [],
          recentActivity: [],
        },
      });
    }

    const cacheKey = `dashboard:${userId.toString()}:${range}`;

    const analytics = await getCachedOrFetch(cacheKey, async () => {
      const groupIds = groups.map((g) => g._id);

      // Collect all unique members across groups
      const memberMap = {};
      groups.forEach((g) => {
        g.members.forEach((m) => {
          memberMap[m._id.toString()] = m;
        });
      });
      const allMembers = Object.values(memberMap);

      const matchFilter = { group: { $in: groupIds } };
      const dateFrom = getDateFilter(range);
      if (dateFrom) {
        matchFilter.date = { $gte: dateFrom };
      }
      return buildAnalytics(matchFilter, allMembers);
    });

    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGroupAnalytics, getDashboardAnalytics };

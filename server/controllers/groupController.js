const { validationResult, body } = require('express-validator');
const crypto = require('crypto');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Import balance computation
const { getBalances: getBalancesRaw } = require('./balanceController');

/**
 * Compute net balances for a group (duplicated inline to avoid circular deps).
 */
const computeGroupBalances = async (groupId) => {
  const expenses = await Expense.find({ group: groupId }).lean();
  const settlements = await Settlement.find({ group: groupId }).lean();

  const balances = {};

  for (const expense of expenses) {
    const paidByStr = expense.paidBy.toString();
    balances[paidByStr] = (balances[paidByStr] || 0) + expense.amount;
    for (const split of expense.splits) {
      const userStr = split.user.toString();
      balances[userStr] = (balances[userStr] || 0) - split.amount;
    }
  }

  for (const settlement of settlements) {
    const fromStr = settlement.paidBy.toString();
    const toStr = settlement.paidTo.toString();
    balances[fromStr] = (balances[fromStr] || 0) + settlement.amount;
    balances[toStr] = (balances[toStr] || 0) - settlement.amount;
  }

  return balances;
};

// @desc   Create group
// @route  POST /api/groups
// @access Private
const createGroup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, description } = req.body;
    const group = await Group.create({
      name,
      description,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    const populated = await Group.findById(group._id).populate('members', '-password').populate('createdBy', '-password').lean();
    res.status(201).json({ success: true, group: populated });
  } catch (err) {
    next(err);
  }
};

// @desc   Get all groups for user
// @route  GET /api/groups
// @access Private
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();
    res.json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

// @desc   Get single group
// @route  GET /api/groups/:id
// @access Private
const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found or access denied' });
    }
    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

// @desc   Update group
// @route  PUT /api/groups/:id
// @access Private (admin/creator only)
const updateGroup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can update it' });
    }

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    const updated = await Group.findById(group._id).populate('members', 'name email avatar').populate('createdBy', 'name email avatar').lean();
    res.json({ success: true, group: updated });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete group + all its expenses
// @route  DELETE /api/groups/:id
// @access Private (creator only)
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can delete it' });
    }

    // Cleanup Cloudinary receipts
    const expenses = await Expense.find({ group: group._id }).lean();
    const cloudinary = require('../config/cloudinary');
    for (const expense of expenses) {
      if (expense.receipt && expense.receipt.publicId) {
        try {
          await cloudinary.uploader.destroy(expense.receipt.publicId);
        } catch (e) {
          console.error('Failed to delete receipt:', e.message);
        }
      }
    }

    await Expense.deleteMany({ group: group._id });
    await Settlement.deleteMany({ group: group._id });
    await Group.findByIdAndDelete(group._id);

    res.json({ success: true, message: 'Group and all related data deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc   Invite member by email
// @route  POST /api/groups/:id/members
// @access Private
const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found or access denied' });

    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!userToAdd) return res.status(404).json({ success: false, message: 'No user found with that email' });

    if (group.members.map(String).includes(String(userToAdd._id))) {
      return res.status(409).json({ success: false, message: 'User is already a member of this group' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updated = await Group.findById(group._id).populate('members', 'name email avatar').populate('createdBy', 'name email avatar').lean();
    res.json({ success: true, group: updated });
  } catch (err) {
    next(err);
  }
};

// @desc   Remove member
// @route  DELETE /api/groups/:id/members/:uid
// @access Private (creator only)
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can remove members' });
    }
    if (group.createdBy.toString() === req.params.uid) {
      return res.status(400).json({ success: false, message: 'Cannot remove the group creator' });
    }

    group.members = group.members.filter((m) => m.toString() !== req.params.uid);
    await group.save();

    const updated = await Group.findById(group._id).populate('members', 'name email avatar').populate('createdBy', 'name email avatar').lean();
    res.json({ success: true, group: updated });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════
// INVITE VIA SHAREABLE LINK
// ═══════════════════════════════════════════════════════

// @desc   Generate invite link
// @route  POST /api/groups/:id/invite-link
// @access Private (creator/admin only)
const generateInviteLink = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can generate invite links' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    group.inviteToken = token;
    group.inviteTokenExpiry = expiry;
    await group.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteUrl = `${clientUrl}/join/${token}`;

    res.json({
      success: true,
      inviteUrl,
      expiresAt: expiry.toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Preview invite (no auth required)
// @route  GET /api/groups/join/:token
// @access Public
const previewInvite = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      inviteToken: req.params.token,
      inviteTokenExpiry: { $gt: new Date() },
    })
      .populate('createdBy', 'name')
      .lean();

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invite link is invalid or has expired' });
    }

    res.json({
      success: true,
      groupName: group.name,
      memberCount: group.members.length,
      creatorName: group.createdBy?.name || 'Unknown',
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Join group via invite token
// @route  POST /api/groups/join/:token
// @access Private (JWT required)
const joinByToken = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      inviteToken: req.params.token,
      inviteTokenExpiry: { $gt: new Date() },
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invite link is invalid or has expired' });
    }

    if (group.members.map(String).includes(req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'You are already a member of this group' });
    }

    group.members.push(req.user._id);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();

    res.json({ success: true, group: populated });
  } catch (err) {
    next(err);
  }
};

// @desc   Revoke invite link
// @route  POST /api/groups/:id/revoke-invite
// @access Private (creator/admin only)
const revokeInvite = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can revoke invite links' });
    }

    group.inviteToken = undefined;
    group.inviteTokenExpiry = undefined;
    await group.save();

    res.json({ success: true, message: 'Invite link revoked' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════
// EXPORT GROUP EXPENSES TO PDF
// ═══════════════════════════════════════════════════════

// @desc   Export group expenses to PDF
// @route  GET /api/groups/:id/export-pdf
// @access Private (must be member)
const exportGroupPDF = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found or access denied' });
    }

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1 })
      .lean();

    const rawBalances = await computeGroupBalances(req.params.id);

    const balances = group.members.map((member) => ({
      user: member,
      netBalance: Math.round((rawBalances[member._id.toString()] || 0) * 100) / 100,
    }));

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    const safeName = group.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-expenses.pdf"`);

    doc.pipe(res);

    // ── PAGE 1 HEADER ──
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#6366f1').text('Expense Splitter', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(18).fillColor('#1e293b').text(group.name);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.text(`Members: ${group.members.map((m) => m.name).join(', ')}`);
    doc.moveDown(0.5);

    // Horizontal rule
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // ── BALANCE SUMMARY TABLE ──
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('Balance Summary');
    doc.moveDown(0.5);

    // Table header
    const balTableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b');
    doc.text('Member', 50, balTableTop, { width: 200 });
    doc.text('Net Balance', 300, balTableTop, { width: 200, align: 'right' });
    doc.moveDown(0.3);
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    for (const b of balances) {
      const yPos = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(b.user.name, 50, yPos, { width: 200 });

      if (Math.abs(b.netBalance) < 0.01) {
        doc.font('Helvetica-Bold').fillColor('#059669').text('SETTLED', 300, yPos, { width: 200, align: 'right' });
      } else if (b.netBalance > 0) {
        doc.font('Helvetica-Bold').fillColor('#059669').text(`+₹${b.netBalance.toFixed(2)}`, 300, yPos, { width: 200, align: 'right' });
      } else {
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(`-₹${Math.abs(b.netBalance).toFixed(2)}`, 300, yPos, { width: 200, align: 'right' });
      }
      doc.moveDown(0.4);
    }

    doc.moveDown(1);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // ── EXPENSE HISTORY TABLE ──
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('Expense History');
    doc.moveDown(0.5);

    if (expenses.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('No expenses recorded.');
    } else {
      // Table header
      const colDate = 50;
      const colTitle = 120;
      const colCategory = 250;
      const colPaidBy = 320;
      const colAmount = 420;
      const colSplit = 490;
      const headerY = doc.y;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('Date', colDate, headerY, { width: 65 });
      doc.text('Title', colTitle, headerY, { width: 125 });
      doc.text('Category', colCategory, headerY, { width: 65 });
      doc.text('Paid By', colPaidBy, headerY, { width: 95 });
      doc.text('Amount', colAmount, headerY, { width: 65, align: 'right' });
      doc.text('Split', colSplit, headerY, { width: 55, align: 'right' });
      doc.moveDown(0.3);
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      // Group expenses by category for subtotals
      const categoryTotals = {};
      let grandTotal = 0;

      for (let i = 0; i < expenses.length; i++) {
        const exp = expenses[i];
        const isShaded = i % 2 === 1;

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        const rowY = doc.y;

        // Alternating row shading
        if (isShaded) {
          doc.rect(45, rowY - 2, 505, 16).fill('#f8fafc').fillColor('#334155');
        }

        const expDate = new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text(expDate, colDate, rowY, { width: 65 });
        doc.text(exp.title.substring(0, 20), colTitle, rowY, { width: 125 });
        doc.text(exp.category || 'Other', colCategory, rowY, { width: 65 });
        doc.text((exp.paidBy?.name || 'Unknown').substring(0, 14), colPaidBy, rowY, { width: 95 });
        doc.font('Helvetica-Bold').text(`₹${exp.amount.toFixed(2)}`, colAmount, rowY, { width: 65, align: 'right' });
        doc.font('Helvetica').text(exp.splitType, colSplit, rowY, { width: 55, align: 'right' });
        doc.moveDown(0.5);

        // Track totals
        const cat = exp.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
        grandTotal += exp.amount;
      }

      // Category subtotals
      doc.moveDown(0.5);
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text('Category Subtotals:');
      doc.moveDown(0.3);

      for (const [cat, total] of Object.entries(categoryTotals).sort()) {
        if (doc.y > 740) doc.addPage();
        const subY = doc.y;
        doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(`  ${cat}`, 50, subY, { width: 350 });
        doc.font('Helvetica-Bold').fillColor('#334155').text(`₹${total.toFixed(2)}`, colAmount, subY, { width: 65, align: 'right' });
        doc.moveDown(0.3);
      }

      // Grand total
      doc.moveDown(0.3);
      doc.strokeColor('#6366f1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      const gtY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Grand Total', 50, gtY, { width: 350 });
      doc.text(`₹${grandTotal.toFixed(2)}`, colAmount, gtY, { width: 65, align: 'right' });
    }

    // ── FOOTER ON EVERY PAGE ──
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { width: 495, align: 'center' }
      );
      doc.text(
        'Exported from Expense Splitter App',
        50,
        doc.page.height - 38,
        { width: 495, align: 'center' }
      );
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

const groupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
];

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  generateInviteLink,
  previewInvite,
  joinByToken,
  revokeInvite,
  exportGroupPDF,
  groupValidation,
};

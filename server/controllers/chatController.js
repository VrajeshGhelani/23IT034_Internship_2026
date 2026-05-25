const Message = require('../models/Message');
const Group = require('../models/Group');

// @desc   Get paginated messages for a group
// @route  GET /api/groups/:id/messages?page=1&limit=30
// @access Private (must be group member)
const getMessages = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    // Verify user is a group member
    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    }).lean();

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: 'Group not found or access denied' });
    }

    const totalMessages = await Message.countDocuments({ group: groupId });
    const totalPages = Math.ceil(totalMessages / limit);

    // Fetch messages sorted desc (newest first), then reverse for display
    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name avatar')
      .lean();

    // Return in ascending order (oldest first) for display
    messages.reverse();

    res.json({
      success: true,
      messages,
      totalPages,
      currentPage: page,
      totalMessages,
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Mark all unread messages as read for the current user
// @route  POST /api/groups/:id/messages/read
// @access Private (must be group member)
const markAsRead = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;

    // Verify user is a group member
    const group = await Group.findOne({
      _id: groupId,
      members: userId,
    }).lean();

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: 'Group not found or access denied' });
    }

    // Add userId to readBy for all messages in this group where user hasn't read yet
    const result = await Message.updateMany(
      {
        group: groupId,
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Get unread message count for a group
// @route  GET /api/groups/:id/messages/unread-count
// @access Private (must be group member)
const getUnreadCount = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;

    const count = await Message.countDocuments({
      group: groupId,
      readBy: { $ne: userId },
    });

    res.json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, markAsRead, getUnreadCount };

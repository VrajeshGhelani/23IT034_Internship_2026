const Message = require('../models/Message');
const Group = require('../models/Group');

const User = require('../models/User');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // JOIN GROUP ROOM
    socket.on('join_group', async ({ groupId, userId }) => {
      try {
        // Verify premium first
        const user = await User.findById(userId);
        if (!user || !user.isPremium()) {
          socket.emit('premium_required', {
            message: 'Chat requires Premium subscription'
          });
          return;
        }

        // Verify user is a group member before allowing join
        const group = await Group.findOne({
          _id: groupId,
          members: userId,
        }).lean();

        if (!group) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        socket.join(groupId);
        socket.data.userId = userId;
        socket.data.groupId = groupId;
        console.log(`User ${userId} joined group ${groupId}`);
      } catch (err) {
        console.error('Error joining group:', err.message);
        socket.emit('error', { message: 'Failed to join group room' });
      }
    });

    // SEND MESSAGE
    socket.on('send_message', async ({ groupId, senderId, text }) => {
      try {
        if (!text || !text.trim()) return;

        // Verify sender is a group member
        const group = await Group.findOne({
          _id: groupId,
          members: senderId,
        }).lean();

        if (!group) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        const message = await Message.create({
          group: groupId,
          sender: senderId,
          text: text.trim(),
          readBy: [senderId],
          createdAt: new Date(),
        });

        const populated = await message.populate('sender', 'name avatar');
        io.to(groupId).emit('receive_message', populated);
      } catch (err) {
        console.error('Error sending message:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // TYPING INDICATOR
    socket.on('typing', ({ groupId, userName }) => {
      socket.to(groupId).emit('user_typing', { userName });
    });

    socket.on('stop_typing', ({ groupId }) => {
      socket.to(groupId).emit('user_stop_typing');
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.data.userId || socket.id);
    });
  });
};

module.exports = socketHandler;

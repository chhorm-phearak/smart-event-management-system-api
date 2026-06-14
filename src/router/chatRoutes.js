const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadChatFiles } = require('../middlewares/uploadMiddleware');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markRead,
  markAllRead,
  unreadCount,
  getReaders,
  searchMessages,
} = require('../controllers/chatController');

// Use mergeParams so :groupId from parent route is available here
const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

// List messages (paginated)
router.get('/', getMessages);

// Unread count for the current user
router.get('/unread-count', unreadCount);

// Search messages within this group
router.get('/search', searchMessages);

// Send a new message (with optional file attachments, max 5 x 10MB)
router.post('/', uploadChatFiles, sendMessage);

// Mark all messages in the group as read
router.post('/read-all', markAllRead);

// Per-message operations
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/read', markRead);
router.get('/:messageId/readers', getReaders);

module.exports = router;

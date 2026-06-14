const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadChatFiles } = require('../middlewares/uploadMiddleware');
const {
  getGlobalMessages,
  sendGlobalMessage,
  markAllGlobalRead,
  getGlobalUnreadCountHandler,
  searchGlobalChatMessages,
} = require('../controllers/chatController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/global-chat/messages
 * Get global chat messages with pagination
 * Query: limit (default 20, max 100), before (message_id cursor)
 */
router.get('/messages', getGlobalMessages);

/**
 * POST /api/global-chat/messages
 * Send a message to global chat
 * Body: { content, message_type?, reply_to_id? }
 * Supports file uploads (max 5 files, 10MB each)
 */
router.post('/messages', uploadChatFiles, sendGlobalMessage);

/**
 * POST /api/global-chat/read-all
 * Mark all global messages as read for the current user
 */
router.post('/read-all', markAllGlobalRead);

/**
 * GET /api/global-chat/unread-count
 * Get unread count for global chat
 */
router.get('/unread-count', getGlobalUnreadCountHandler);

/**
 * GET /api/global-chat/search
 * Search global messages by content
 * Query: q (search term), limit (default 50, max 100)
 */
router.get('/search', searchGlobalChatMessages);

module.exports = router;

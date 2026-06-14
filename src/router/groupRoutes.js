const express = require('express');
const {
  create,
  getAll,
  getById,
  getOrganizationGroups,
  getStats,
  update,
  remove,
  inviteMember,
  removeMember,
} = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');
const chatRoutes = require('./chatRoutes');
const { getConversations, searchAllMessages } = require('../controllers/chatController');

const router = express.Router();

// IMPORTANT: register specific routes BEFORE the catch-all `/:groupId/messages` mount
// so they aren't intercepted by the chat sub-router treating "messages" as a groupId.
router.get('/messages/search', authMiddleware, searchAllMessages);

// Group chat routes: /api/groups/:groupId/messages/*
router.use('/:groupId/messages', chatRoutes);

// All group routes require authentication
router.post('/', authMiddleware, create);
router.get('/', authMiddleware, getAll);
router.get('/conversations', authMiddleware, getConversations);
router.get('/organization', authMiddleware, getOrganizationGroups);
router.get('/:id', authMiddleware, getById);
router.get('/:id/stats', authMiddleware, getStats);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
router.post('/:id/invite', authMiddleware, inviteMember);
router.delete('/:id/members/:member_id', authMiddleware, removeMember);

module.exports = router;


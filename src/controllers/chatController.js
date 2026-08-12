const {
  createMessage,
  findMessageById,
  listGroupMessages,
  listGlobalMessages,
  countGroupMessages,
  updateMessageContent,
  softDeleteMessage,
  markMessageRead,
  markGroupRead,
  markGlobalRead,
  getUnreadCount,
  getGlobalUnreadCount,
  getMessageReaders,
  getUserConversations,
  searchGroupMessages,
  searchGlobalMessages,
  searchUserMessages,
} = require('../repository/chatRepository');
const { ensureGroupChatAccess, ensureGlobalChatAccess, formatMessage } = require('../services/chatService');
const { getPublicUrl, getFullUrl } = require('../services/uploadService');
const { isOrganizationOwner, findOrganizationById } = require('../repository/organizationRepository');
const { findGroupById, getGroupMembers } = require('../repository/groupRepository');
const { emitToGroup, emitToUser } = require('../config/socket');

const handleAccessError = (err, res) => {
  if (err && err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
};

/**
 * GET /api/groups/:groupId/messages
 * Query: limit (default 20, max 100), before (message_id cursor)
 */
const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;
    const before = req.query.before || null;

    const [rows, total] = await Promise.all([
      listGroupMessages(groupId, { limit, before }),
      countGroupMessages(groupId),
    ]);

    // Return in chronological order (oldest -> newest) for easy rendering
    const messages = rows.slice().reverse().map(formatMessage);

    return res.json({
      message: 'Messages retrieved successfully',
      data: {
        messages,
        pagination: {
          total,
          limit,
          has_more: rows.length === limit,
          next_before: rows.length === limit ? rows[rows.length - 1].id : null,
        },
      },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * POST /api/groups/:groupId/messages
 * Body: { content, reply_to_id }
 * Files: multipart `files` (handled by uploadChatFiles middleware) - up to 5 files, 10MB each
 */
const sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const { content, reply_to_id } = req.body;
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent && uploadedFiles.length === 0) {
      return res.status(400).json({
        message: 'Message must contain text content or at least one file',
      });
    }

    let message_type = 'text';
    if (uploadedFiles.length > 0 && trimmedContent) message_type = 'mixed';
    else if (uploadedFiles.length > 0) message_type = 'file';

    // Validate reply_to_id (must belong to same group)
    if (reply_to_id) {
      const replyMsg = await findMessageById(reply_to_id);
      if (!replyMsg || replyMsg.group_id !== groupId || replyMsg.is_deleted) {
        return res.status(400).json({ message: 'Invalid reply_to_id' });
      }
    }

    const filesPayload = uploadedFiles.map((f) => ({
      file_url: getPublicUrl(f.path),
      file_name: f.originalname,
      file_size: f.size,
      file_type: f.mimetype,
    }));

    const created = await createMessage({
      group_id: groupId,
      sender_id: userId,
      content: trimmedContent || null,
      message_type,
      reply_to_id: reply_to_id || null,
      files: filesPayload,
    });

    // Reload with sender info for clean response
    const fullMessage = await findMessageById(created.id);
    const formatted = formatMessage(fullMessage);

    // Broadcast to all clients currently in the group room (open chat window)
    emitToGroup(groupId, 'chat:new_message', formatted);

    // Also push a lightweight conversation-list update to each group member's
    // personal room (user:<id>) so the sidebar updates even if the user
    // does NOT have the chat window open.
    try {
      const senderName = `${formatted.sender.first_name || ''} ${formatted.sender.last_name || ''}`.trim();
      const previewContent = formatted.content
        || (formatted.files && formatted.files.length > 0 ? '[Attachment]' : '');

      const conversationPayload = {
        group_id: groupId,
        last_message: {
          id: formatted.id,
          content: previewContent,
          message_type: formatted.message_type,
          created_at: formatted.created_at,
          sender_id: formatted.sender.id,
          sender_name: senderName,
        },
      };

      // Recipients = all group members + organization owner (who may not be a member)
      const [members, group] = await Promise.all([
        getGroupMembers(groupId),
        findGroupById(groupId),
      ]);
      const recipientIds = new Set(members.map((m) => m.user_id));
      if (group) {
        const org = await findOrganizationById(group.organization_id);
        if (org && org.user_id) recipientIds.add(org.user_id);
      }

      for (const recipientId of recipientIds) {
        emitToUser(recipientId, 'chat:conversation_update', {
          ...conversationPayload,
          is_own: recipientId === userId,
        });
      }
    } catch (broadcastErr) {
      // Don't fail the request just because a side-channel broadcast failed.
      console.error('Failed to broadcast conversation update:', broadcastErr);
    }

    return res.status(201).json({
      message: 'Message sent successfully',
      data: { message: formatted },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * PUT /api/groups/:groupId/messages/:messageId
 * Body: { content }
 */
const editMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { content } = req.body;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const existing = await findMessageById(messageId);
    if (!existing || existing.is_deleted || existing.group_id !== groupId) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (existing.sender_id !== userId) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      return res.status(400).json({ message: 'content is required' });
    }

    await updateMessageContent(messageId, trimmed);
    const updated = await findMessageById(messageId);
    const formatted = formatMessage(updated);

    emitToGroup(groupId, 'chat:message_edited', formatted);

    return res.json({
      message: 'Message updated successfully',
      data: { message: formatted },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * DELETE /api/groups/:groupId/messages/:messageId
 * Sender or organization owner / admin can delete.
 */
const deleteMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const existing = await findMessageById(messageId);
    if (!existing || existing.is_deleted || existing.group_id !== groupId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    let canDelete = existing.sender_id === userId || userRole === 'admin_role';
    if (!canDelete) {
      const group = await findGroupById(groupId);
      canDelete = await isOrganizationOwner(group.organization_id, userId);
    }
    if (!canDelete) {
      return res.status(403).json({ message: 'You do not have permission to delete this message' });
    }

    await softDeleteMessage(messageId);
    emitToGroup(groupId, 'chat:message_deleted', { id: messageId, group_id: groupId });

    return res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * POST /api/groups/:groupId/messages/:messageId/read
 */
const markRead = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const existing = await findMessageById(messageId);
    if (!existing || existing.group_id !== groupId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await markMessageRead(messageId, userId);
    const readPayload = {
      message_id: messageId,
      group_id: groupId,
      user_id: userId,
      read_at: new Date().toISOString(),
    };
    // Broadcast to anyone with the chat open
    emitToGroup(groupId, 'chat:message_read', readPayload);
    // Also notify the original sender personally (in case their chat is closed)
    if (existing.sender_id && existing.sender_id !== userId) {
      emitToUser(existing.sender_id, 'chat:message_read', readPayload);
    }

    return res.json({ message: 'Message marked as read' });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * POST /api/groups/:groupId/messages/read-all
 */
const markAllRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const updated = await markGroupRead(groupId, userId);
    const messageIds = updated.map((r) => r.message_id);
    const readAt = new Date().toISOString();

    emitToGroup(groupId, 'chat:group_read', {
      group_id: groupId,
      user_id: userId,
      read_at: readAt,
      message_ids: messageIds,
    });

    // Also notify each original sender personally so they see ✓✓ even if
    // their chat window is closed.
    if (messageIds.length > 0) {
      try {
        const sendersResult = await require('../config/db').query(
          `SELECT id, sender_id FROM chat_messages WHERE id IN (?)`,
          [messageIds]
        );
        const senderToMsgIds = new Map();
        for (const row of sendersResult.rows) {
          if (row.sender_id === userId) continue;
          if (!senderToMsgIds.has(row.sender_id)) senderToMsgIds.set(row.sender_id, []);
          senderToMsgIds.get(row.sender_id).push(row.id);
        }
        for (const [senderId, ids] of senderToMsgIds.entries()) {
          emitToUser(senderId, 'chat:group_read', {
            group_id: groupId,
            user_id: userId,
            read_at: readAt,
            message_ids: ids,
          });
        }
      } catch (e) {
        console.error('Failed to notify senders of read receipts:', e);
      }
    }

    return res.json({
      message: 'All messages marked as read',
      data: { marked_count: updated.length },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/groups/:groupId/messages/unread-count
 */
const unreadCount = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const count = await getUnreadCount(groupId, userId);
    return res.json({
      message: 'Unread count retrieved successfully',
      data: { unread_count: count },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/groups/:groupId/messages/:messageId/readers
 */
const getReaders = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    await ensureGroupChatAccess(groupId, userId, userRole);

    const existing = await findMessageById(messageId);
    if (!existing || existing.group_id !== groupId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const readers = await getMessageReaders(messageId);
    return res.json({
      message: 'Readers retrieved successfully',
      data: { readers },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/groups/conversations
 * Returns all groups the user belongs to (or owns) with last message preview and unread count.
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const search = typeof req.query.q === 'string' ? req.query.q : null;
    const rows = await getUserConversations(userId, search);

    const conversations = rows.map((row) => {
      const senderName = row.last_message_sender_id
        ? `${row.sender_first_name || ''} ${row.sender_last_name || ''}`.trim()
        : null;

      // Generate a preview string. For file-only messages, show a placeholder.
      let preview = row.last_message_content;
      if (row.last_message_id && !row.last_message_content) {
        if (row.last_message_type === 'file') preview = '[Attachment]';
      }

      return {
        id: row.id,
        name: row.name,
        image_url: row.image_url ? getFullUrl(row.image_url) : null,
        member_count: row.member_count,
        unread_count: row.unread_count || 0,
        last_message: row.last_message_id
          ? {
              id: row.last_message_id,
              content: preview,
              message_type: row.last_message_type,
              created_at: row.last_message_created_at,
              sender_id: row.last_message_sender_id,
              sender_name: senderName,
              is_own: row.last_message_sender_id === userId,
            }
          : null,
      };
    });

    return res.json({
      message: 'Conversations retrieved successfully',
      data: { conversations },
    });
  } catch (err) {
    console.error('Error retrieving conversations:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/groups/:groupId/messages/search?q=...&limit=50
 * Search message content within a single group.
 */
const searchMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    if (!q) {
      return res.status(400).json({ message: 'Query parameter `q` is required' });
    }

    await ensureGroupChatAccess(groupId, userId, userRole);

    const rows = await searchGroupMessages(groupId, q, { limit });
    const messages = rows.map(formatMessage);

    return res.json({
      message: 'Search completed',
      data: {
        query: q,
        count: messages.length,
        messages,
      },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/groups/messages/search?q=...&limit=50
 * Search messages across ALL groups the user has access to.
 */
const searchAllMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    if (!q) {
      return res.status(400).json({ message: 'Query parameter `q` is required' });
    }

    const rows = await searchUserMessages(userId, q, { limit });

    const results = rows.map((row) => ({
      id: row.id,
      group: {
        id: row.group_id,
        name: row.group_name,
        image_url: row.group_image_url ? getFullUrl(row.group_image_url) : null,
      },
      content: row.content,
      message_type: row.message_type,
      created_at: row.created_at,
      sender: {
        id: row.sender_id,
        first_name: row.sender_first_name,
        last_name: row.sender_last_name,
        email: row.sender_email,
        img_url: row.sender_img_url ? getFullUrl(row.sender_img_url) : null,
      },
    }));

    return res.json({
      message: 'Search completed',
      data: {
        query: q,
        count: results.length,
        results,
      },
    });
  } catch (err) {
    console.error('Error searching messages:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// =====================================================
// GLOBAL CHAT CONTROLLERS
// =====================================================

/**
 * GET /api/global-chat/messages
 * Get global chat messages with pagination
 */
const getGlobalMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    await ensureGlobalChatAccess(userId);

    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;
    const before = req.query.before || null;

    const rows = await listGlobalMessages({ limit, before });
    const messages = rows.map(formatMessage);

    return res.json({
      data: messages,
      pagination: {
        limit,
        has_more: rows.length === limit,
      },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * POST /api/global-chat/messages
 * Send a message to global chat
 */
const sendGlobalMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, message_type = 'text', reply_to_id } = req.body;

    await ensureGlobalChatAccess(userId);

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    let messageType = message_type;
    let uploadedFiles = [];

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files.map((file) => ({
        file_url: getPublicUrl(file.filename),
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
      }));
      messageType = uploadedFiles.length > 0 && content ? 'mixed' : 
                   uploadedFiles.length > 0 ? 'file' : 'text';
    }

    const message = await createMessage({
      group_id: null,
      sender_id: userId,
      content: content.trim(),
      message_type: messageType,
      reply_to_id: reply_to_id || null,
      files: uploadedFiles,
      scope: 'global',
    });

    // Load full message data
    const fullMessage = await findMessageById(message.id);
    const formatted = formatMessage(fullMessage);

    // Broadcast to all users in global chat
    emitToGroup('global', 'chat:new_message', formatted);

    return res.status(201).json(formatted);
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * POST /api/global-chat/read-all
 * Mark all global messages as read
 */
const markAllGlobalRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await ensureGlobalChatAccess(userId);

    const updated = await markGlobalRead(userId);
    const messageIds = updated.map((r) => r.message_id);
    const readAt = new Date().toISOString();

    // Broadcast to all users in global chat
    emitToGroup('global', 'chat:global_read', {
      user_id: userId,
      read_at: readAt,
      message_ids: messageIds,
    });

    return res.json({
      message: 'All global messages marked as read',
      data: { marked_count: updated.length },
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/global-chat/unread-count
 * Get unread count for global chat
 */
const getGlobalUnreadCountHandler = async (req, res) => {
  try {
    const userId = req.user.id;

    await ensureGlobalChatAccess(userId);

    const count = await getGlobalUnreadCount(userId);

    return res.json({ data: { unread_count: count } });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

/**
 * GET /api/global-chat/search
 * Search global messages
 */
const searchGlobalChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    await ensureGlobalChatAccess(userId);

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    const rows = await searchGlobalMessages(q.trim(), { limit });
    const messages = rows.map(formatMessage);

    return res.json({
      data: messages,
      query: q.trim(),
      count: messages.length,
    });
  } catch (err) {
    return handleAccessError(err, res);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markRead,
  markAllRead,
  unreadCount,
  getReaders,
  getConversations,
  searchMessages,
  searchAllMessages,
  // Global chat
  getGlobalMessages,
  sendGlobalMessage,
  markAllGlobalRead,
  getGlobalUnreadCountHandler,
  searchGlobalChatMessages,
};

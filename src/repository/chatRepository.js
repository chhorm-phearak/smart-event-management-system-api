const db = require('../config/db');
const { newId } = require('../utils/uuid');

/**
 * Insert a chat message and (optionally) its attached files in one transaction.
 * @param {object} params
 * @param {string} params.group_id
 * @param {string} params.sender_id
 * @param {string|null} params.content
 * @param {string} params.message_type - 'text' | 'file' | 'mixed'
 * @param {string|null} params.reply_to_id
 * @param {Array<{file_url:string,file_name:string,file_size:number,file_type:string}>} params.files
 */
const createMessage = async ({ group_id, sender_id, content, message_type, reply_to_id, files, scope = 'group' }) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const messageId = newId();
    await client.query(
      `INSERT INTO chat_messages (id, group_id, sender_id, content, message_type, reply_to_id, scope)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, scope === 'global' ? null : group_id, sender_id, content || null, message_type, reply_to_id || null, scope]
    );
    const messageResult = await client.query(`SELECT * FROM chat_messages WHERE id = ?`, [messageId]);
    const message = messageResult.rows[0];

    const insertedFiles = [];
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        const fileId = newId();
        await client.query(
          `INSERT INTO chat_message_files (id, message_id, file_url, file_name, file_size, file_type, scope)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [fileId, messageId, f.file_url, f.file_name || null, f.file_size || null, f.file_type || null, scope]
        );
        const fileResult = await client.query(`SELECT * FROM chat_message_files WHERE id = ?`, [fileId]);
        insertedFiles.push(fileResult.rows[0]);
      }
    }

    await client.query('COMMIT');
    return { ...message, files: insertedFiles };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get a single message by id with sender info, files, and reply target.
 */
const findMessageById = async (messageId) => {
  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.id = ?`,
    [messageId]
  );
  const message = result.rows[0];
  if (!message) return null;

  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = ? ORDER BY created_at ASC`,
    [messageId]
  );
  message.files = filesResult.rows;

  const readsResult = await db.query(
    `SELECT message_id, user_id, read_at FROM chat_message_reads WHERE message_id = ?`,
    [messageId]
  );
  message.reads = readsResult.rows;
  return message;
};

/**
 * List messages for a group, paginated. Newest first.
 * Optional `before` cursor: returns messages older than that message's created_at.
 */
const listGroupMessages = async (groupId, { limit = 20, before = null } = {}) => {
  const params = [groupId];
  let cursorClause = '';
  if (before) {
    params.push(before);
    cursorClause = `AND m.created_at < (SELECT created_at FROM (SELECT created_at FROM chat_messages WHERE id = ?) AS cursor_msg)`;
  }
  params.push(Number(limit));

  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.group_id = ?
       AND m.is_deleted = FALSE
       ${cursorClause}
     ORDER BY m.created_at DESC
     LIMIT ?`,
    params
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id IN (?)
     ORDER BY created_at ASC`,
    [messageIds]
  );

  const filesByMessage = new Map();
  for (const f of filesResult.rows) {
    if (!filesByMessage.has(f.message_id)) filesByMessage.set(f.message_id, []);
    filesByMessage.get(f.message_id).push(f);
  }

  // Load read receipts for all messages in one query
  const readsResult = await db.query(
    `SELECT message_id, user_id, read_at FROM chat_message_reads
     WHERE message_id IN (?)`,
    [messageIds]
  );
  const readsByMessage = new Map();
  for (const r of readsResult.rows) {
    if (!readsByMessage.has(r.message_id)) readsByMessage.set(r.message_id, []);
    readsByMessage.get(r.message_id).push(r);
  }

  for (const m of messages) {
    m.files = filesByMessage.get(m.id) || [];
    m.reads = readsByMessage.get(m.id) || [];
  }
  return messages;
};

const countGroupMessages = async (groupId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count FROM chat_messages WHERE group_id = ? AND is_deleted = FALSE`,
    [groupId]
  );
  return Number(result.rows[0].count);
};

const updateMessageContent = async (messageId, content) => {
  await db.query(
    `UPDATE chat_messages
       SET content = ?, is_edited = TRUE, updated_at = NOW()
     WHERE id = ? AND is_deleted = FALSE`,
    [content, messageId]
  );
  const result = await db.query(`SELECT * FROM chat_messages WHERE id = ?`, [messageId]);
  return result.rows[0];
};

const softDeleteMessage = async (messageId) => {
  await db.query(
    `UPDATE chat_messages
       SET is_deleted = TRUE, updated_at = NOW()
     WHERE id = ?`,
    [messageId]
  );
  const result = await db.query(`SELECT * FROM chat_messages WHERE id = ?`, [messageId]);
  return result.rows[0];
};

const markMessageRead = async (messageId, userId, scope = 'group') => {
  await db.query(
    `INSERT IGNORE INTO chat_message_reads (id, message_id, user_id, scope)
     VALUES (?, ?, ?, ?)`,
    [newId(), messageId, userId, scope]
  );
  const result = await db.query(
    `SELECT * FROM chat_message_reads WHERE message_id = ? AND user_id = ?`,
    [messageId, userId]
  );
  return result.rows[0];
};

/**
 * Mark all messages in a group as read for a user (excluding their own messages).
 */
const markGroupRead = async (groupId, userId) => {
  await db.query(
    `INSERT IGNORE INTO chat_message_reads (id, message_id, user_id)
     SELECT UUID(), m.id, ? FROM chat_messages m
     WHERE m.group_id = ? AND m.is_deleted = FALSE AND m.sender_id <> ?`,
    [userId, groupId, userId]
  );
  const result = await db.query(
    `SELECT r.message_id
     FROM chat_message_reads r
     INNER JOIN chat_messages m ON m.id = r.message_id
     WHERE m.group_id = ? AND r.user_id = ?`,
    [groupId, userId]
  );
  return result.rows;
};

const getUnreadCount = async (groupId, userId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM chat_messages m
     WHERE m.group_id = ?
       AND m.is_deleted = FALSE
       AND m.sender_id <> ?
       AND NOT EXISTS (
         SELECT 1 FROM chat_message_reads r
         WHERE r.message_id = m.id AND r.user_id = ?
       )`,
    [groupId, userId, userId]
  );
  return Number(result.rows[0].count);
};

const getMessageReaders = async (messageId) => {
  const result = await db.query(
    `SELECT r.user_id, r.read_at,
            u.first_name, u.last_name, up.img_url
     FROM chat_message_reads r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE r.message_id = ?
     ORDER BY r.read_at ASC`,
    [messageId]
  );
  return result.rows;
};

/**
 * Return the user's group conversations with last message + unread count.
 * Includes groups where user is a member OR owns the parent organization.
 */
const getUserConversations = async (userId, search = null) => {
  const params = [userId, userId, userId, userId, userId];
  let searchClause = '';
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    searchClause = `AND g.name LIKE ?`;
  }

  const result = await db.query(
    `SELECT
        g.id,
        g.name,
        g.image_url,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        last_msg.id            AS last_message_id,
        last_msg.content       AS last_message_content,
        last_msg.message_type  AS last_message_type,
        last_msg.created_at    AS last_message_created_at,
        last_msg.sender_id     AS last_message_sender_id,
        last_sender.first_name AS sender_first_name,
        last_sender.last_name  AS sender_last_name,
        (
          SELECT COUNT(*) FROM chat_messages m
          WHERE m.group_id = g.id
            AND m.is_deleted = FALSE
            AND m.sender_id <> ?
            AND NOT EXISTS (
              SELECT 1 FROM chat_message_reads r
              WHERE r.message_id = m.id AND r.user_id = ?
            )
        ) AS unread_count
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
     LEFT JOIN chat_messages last_msg ON last_msg.id = (
        SELECT m2.id
        FROM chat_messages m2
        WHERE m2.group_id = g.id AND m2.is_deleted = FALSE
        ORDER BY m2.created_at DESC
        LIMIT 1
     )
     LEFT JOIN users last_sender ON last_msg.sender_id = last_sender.id
     WHERE g.is_deleted = FALSE
       AND (gm.user_id = ? OR o.user_id = ?)
       ${searchClause}
     ORDER BY COALESCE(last_msg.created_at, g.created_at) DESC`,
    params
  );
  return result.rows;
};

/**
 * Search messages within a single group by content.
 */
const searchGroupMessages = async (groupId, query, { limit = 50 } = {}) => {
  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.group_id = ?
       AND m.is_deleted = FALSE
       AND m.content LIKE ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [groupId, `%${query}%`, Number(limit)]
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id IN (?)
     ORDER BY created_at ASC`,
    [messageIds]
  );

  const filesByMessage = new Map();
  for (const f of filesResult.rows) {
    if (!filesByMessage.has(f.message_id)) filesByMessage.set(f.message_id, []);
    filesByMessage.get(f.message_id).push(f);
  }
  for (const m of messages) {
    m.files = filesByMessage.get(m.id) || [];
  }
  return messages;
};

/**
 * Search messages across ALL groups the user has access to.
 * Returns messages with their group info attached.
 */
const searchUserMessages = async (userId, query, { limit = 50 } = {}) => {
  const result = await db.query(
    `SELECT m.*,
            g.name AS group_name,
            g.image_url AS group_image_url,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     INNER JOIN \`groups\` g ON m.group_id = g.id AND g.is_deleted = FALSE
     LEFT JOIN organizations o ON g.organization_id = o.id
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.is_deleted = FALSE
       AND m.content LIKE ?
       AND (gm.user_id = ? OR o.user_id = ?)
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [userId, `%${query}%`, userId, userId, Number(limit)]
  );
  return result.rows;
};

// =====================================================
// GLOBAL CHAT FUNCTIONS
// =====================================================

/**
 * List global messages, paginated. Newest first.
 */
const listGlobalMessages = async ({ limit = 20, before = null } = {}) => {
  const params = [];
  let cursorClause = '';
  if (before) {
    params.push(before);
    cursorClause = `AND m.created_at < (SELECT created_at FROM (SELECT created_at FROM chat_messages WHERE id = ?) AS cursor_msg)`;
  }
  params.push(Number(limit));

  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.scope = 'global'
       AND m.is_deleted = FALSE
       ${cursorClause}
     ORDER BY m.created_at DESC
     LIMIT ?`,
    params
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id IN (?) AND scope = 'global'
     ORDER BY created_at ASC`,
    [messageIds]
  );

  const filesByMessage = new Map();
  for (const f of filesResult.rows) {
    if (!filesByMessage.has(f.message_id)) filesByMessage.set(f.message_id, []);
    filesByMessage.get(f.message_id).push(f);
  }

  // Load read receipts for all messages in one query
  const readsResult = await db.query(
    `SELECT message_id, user_id, read_at FROM chat_message_reads
     WHERE message_id IN (?) AND scope = 'global'`,
    [messageIds]
  );
  const readsByMessage = new Map();
  for (const r of readsResult.rows) {
    if (!readsByMessage.has(r.message_id)) readsByMessage.set(r.message_id, []);
    readsByMessage.get(r.message_id).push(r);
  }

  for (const m of messages) {
    m.files = filesByMessage.get(m.id) || [];
    m.reads = readsByMessage.get(m.id) || [];
  }
  return messages;
};

/**
 * Mark all global messages as read for a user (excluding their own messages).
 */
const markGlobalRead = async (userId) => {
  await db.query(
    `INSERT IGNORE INTO chat_message_reads (id, message_id, user_id, scope)
     SELECT UUID(), m.id, ?, 'global' FROM chat_messages m
     WHERE m.scope = 'global' AND m.is_deleted = FALSE AND m.sender_id <> ?`,
    [userId, userId]
  );
  const result = await db.query(
    `SELECT message_id FROM chat_message_reads WHERE user_id = ? AND scope = 'global'`,
    [userId]
  );
  return result.rows;
};

/**
 * Get global unread count for a user.
 */
const getGlobalUnreadCount = async (userId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM chat_messages m
     WHERE m.scope = 'global'
       AND m.is_deleted = FALSE
       AND m.sender_id <> ?
       AND NOT EXISTS (
         SELECT 1 FROM chat_message_reads r
         WHERE r.message_id = m.id AND r.user_id = ? AND r.scope = 'global'
       )`,
    [userId, userId]
  );
  return Number(result.rows[0].count);
};

/**
 * Search global messages by content.
 */
const searchGlobalMessages = async (query, { limit = 50 } = {}) => {
  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.scope = 'global'
       AND m.is_deleted = FALSE
       AND m.content LIKE ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [`%${query}%`, Number(limit)]
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id IN (?) AND scope = 'global'
     ORDER BY created_at ASC`,
    [messageIds]
  );

  const filesByMessage = new Map();
  for (const f of filesResult.rows) {
    if (!filesByMessage.has(f.message_id)) filesByMessage.set(f.message_id, []);
    filesByMessage.get(f.message_id).push(f);
  }
  for (const m of messages) {
    m.files = filesByMessage.get(m.id) || [];
  }
  return messages;
};

module.exports = {
  createMessage,
  getUserConversations,
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
  searchGroupMessages,
  searchGlobalMessages,
  searchUserMessages,
};

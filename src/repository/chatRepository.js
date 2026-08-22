const db = require('../config/db');

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

    const messageResult = await client.query(
      `INSERT INTO chat_messages (group_id, sender_id, content, message_type, reply_to_id, scope)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [scope === 'global' ? null : group_id, sender_id, content || null, message_type, reply_to_id || null, scope]
    );
    const message = messageResult.rows[0];

    const insertedFiles = [];
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        const fileResult = await client.query(
          `INSERT INTO chat_message_files (message_id, file_url, file_name, file_size, file_type, scope)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [message.id, f.file_url, f.file_name || null, f.file_size || null, f.file_type || null, scope]
        );
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
     WHERE m.id = $1`,
    [messageId]
  );
  const message = result.rows[0];
  if (!message) return null;

  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = $1 ORDER BY created_at ASC`,
    [messageId]
  );
  message.files = filesResult.rows;

  const readsResult = await db.query(
    `SELECT message_id, user_id, read_at FROM chat_message_reads WHERE message_id = $1`,
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
    cursorClause = `AND m.created_at < (SELECT created_at FROM chat_messages WHERE id = $${params.length})`;
  }
  params.push(limit);

  const result = await db.query(
    `SELECT m.*,
            u.first_name AS sender_first_name,
            u.last_name  AS sender_last_name,
            u.email      AS sender_email,
            up.img_url   AS sender_img_url
     FROM chat_messages m
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.group_id = $1
       AND m.is_deleted = FALSE
       ${cursorClause}
     ORDER BY m.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = ANY($1::uuid[])
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
     WHERE message_id = ANY($1::uuid[])`,
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
    `SELECT COUNT(*)::int AS count FROM chat_messages WHERE group_id = $1 AND is_deleted = FALSE`,
    [groupId]
  );
  return result.rows[0].count;
};

const updateMessageContent = async (messageId, content) => {
  const result = await db.query(
    `UPDATE chat_messages
       SET content = $2, is_edited = TRUE, updated_at = NOW()
     WHERE id = $1 AND is_deleted = FALSE
     RETURNING *`,
    [messageId, content]
  );
  return result.rows[0];
};

const softDeleteMessage = async (messageId) => {
  const result = await db.query(
    `UPDATE chat_messages
       SET is_deleted = TRUE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [messageId]
  );
  return result.rows[0];
};

const markMessageRead = async (messageId, userId, scope = 'group') => {
  const result = await db.query(
    `INSERT INTO chat_message_reads (message_id, user_id, scope)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id) DO NOTHING
     RETURNING *`,
    [messageId, userId, scope]
  );
  return result.rows[0];
};

/**
 * Mark all messages in a group as read for a user (excluding their own messages).
 */
const markGroupRead = async (groupId, userId) => {
  const result = await db.query(
    `INSERT INTO chat_message_reads (message_id, user_id)
     SELECT m.id, $2 FROM chat_messages m
     WHERE m.group_id = $1 AND m.is_deleted = FALSE AND m.sender_id <> $2
     ON CONFLICT (message_id, user_id) DO NOTHING
     RETURNING message_id`,
    [groupId, userId]
  );
  return result.rows;
};

const getUnreadCount = async (groupId, userId) => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM chat_messages m
     WHERE m.group_id = $1
       AND m.is_deleted = FALSE
       AND m.sender_id <> $2
       AND NOT EXISTS (
         SELECT 1 FROM chat_message_reads r
         WHERE r.message_id = m.id AND r.user_id = $2
       )`,
    [groupId, userId]
  );
  return result.rows[0].count;
};

const getMessageReaders = async (messageId) => {
  const result = await db.query(
    `SELECT r.user_id, r.read_at,
            u.first_name, u.last_name, up.img_url
     FROM chat_message_reads r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE r.message_id = $1
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
  const params = [userId];
  let searchClause = '';
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    searchClause = `AND g.name ILIKE $${params.length}`;
  }

  const result = await db.query(
    `SELECT
        g.id,
        g.name,
        g.image_url,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::int AS member_count,
        last_msg.id            AS last_message_id,
        last_msg.content       AS last_message_content,
        last_msg.message_type  AS last_message_type,
        last_msg.created_at    AS last_message_created_at,
        last_msg.sender_id     AS last_message_sender_id,
        last_msg.sender_first_name,
        last_msg.sender_last_name,
        (
          SELECT COUNT(*)::int FROM chat_messages m
          WHERE m.group_id = g.id
            AND m.is_deleted = FALSE
            AND m.sender_id <> $1
            AND NOT EXISTS (
              SELECT 1 FROM chat_message_reads r
              WHERE r.message_id = m.id AND r.user_id = $1
            )
        ) AS unread_count
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     LEFT JOIN LATERAL (
        SELECT m.id, m.content, m.message_type, m.created_at, m.sender_id,
               u.first_name AS sender_first_name,
               u.last_name  AS sender_last_name
        FROM chat_messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = g.id AND m.is_deleted = FALSE
        ORDER BY m.created_at DESC
        LIMIT 1
     ) last_msg ON TRUE
     WHERE g.is_deleted = FALSE
       AND (gm.user_id = $1 OR o.user_id = $1)
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
     WHERE m.group_id = $1
       AND m.is_deleted = FALSE
       AND m.content ILIKE $2
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [groupId, `%${query}%`, limit]
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = ANY($1::uuid[])
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
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     LEFT JOIN users u ON m.sender_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE m.is_deleted = FALSE
       AND m.content ILIKE $2
       AND (gm.user_id = $1 OR o.user_id = $1)
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [userId, `%${query}%`, limit]
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
    cursorClause = `AND m.created_at < (SELECT created_at FROM chat_messages WHERE id = $${params.length})`;
  }
  params.push(limit);

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
     LIMIT $${params.length}`,
    params
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = ANY($1::uuid[]) AND scope = 'global'
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
     WHERE message_id = ANY($1::uuid[]) AND scope = 'global'`,
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
  const result = await db.query(
    `INSERT INTO chat_message_reads (message_id, user_id, scope)
     SELECT m.id, $1, 'global' FROM chat_messages m
     WHERE m.scope = 'global' AND m.is_deleted = FALSE AND m.sender_id <> $1
     ON CONFLICT (message_id, user_id) DO NOTHING
     RETURNING message_id`,
    [userId]
  );
  return result.rows;
};

/**
 * Get global unread count for a user.
 */
const getGlobalUnreadCount = async (userId) => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM chat_messages m
     WHERE m.scope = 'global'
       AND m.is_deleted = FALSE
       AND m.sender_id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM chat_message_reads r
         WHERE r.message_id = m.id AND r.user_id = $1 AND r.scope = 'global'
       )`,
    [userId]
  );
  return result.rows[0].count;
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
       AND m.content ILIKE $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [`%${query}%`, limit]
  );

  const messages = result.rows;
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const filesResult = await db.query(
    `SELECT * FROM chat_message_files WHERE message_id = ANY($1::uuid[]) AND scope = 'global'
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

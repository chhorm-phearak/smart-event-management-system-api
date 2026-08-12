const crypto = require('crypto');
const db = require('../config/db');
const { newId } = require('../utils/uuid');

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateToken = () => {
  const bytes = crypto.randomBytes(64);
  let token = '';
  for (const byte of bytes) {
    token += TOKEN_CHARS[byte % TOKEN_CHARS.length];
  }
  return token;
};

/**
 * Replaces the Postgres update_expired_links() function: links that ran out of
 * uses or passed their expiry date are flagged as expired.
 */
const expireStaleLinks = async () => {
  await db.query(
    `UPDATE invite_links
     SET is_expired = TRUE, is_active = FALSE, updated_at = NOW()
     WHERE is_expired = FALSE
       AND (
         (expires_at IS NOT NULL AND expires_at < NOW()) OR
         (current_uses >= max_uses)
       )`
  );
};

/**
 * Replaces the Postgres expire_existing_group_links() trigger: only the newest
 * link of a group stays active.
 */
const expireOtherGroupLinks = async (groupId, keepLinkId) => {
  await db.query(
    `UPDATE invite_links
     SET is_expired = TRUE, is_active = FALSE, updated_at = NOW()
     WHERE group_id = ?
       AND is_active = TRUE
       AND is_expired = FALSE
       AND id <> ?`,
    [groupId, keepLinkId]
  );
};

const create = async ({
  group_id,
  created_by,
  expires_at = null,
  max_uses = 1,
  message = null,
  token = null
}) => {
  const linkId = newId();
  const linkToken = token || generateToken();

  await db.query(
    `INSERT INTO invite_links (
      id, token, group_id, created_by, expires_at, max_uses, message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [linkId, linkToken, group_id, created_by, expires_at, max_uses, message]
  );

  await expireOtherGroupLinks(group_id, linkId);

  return await findById(linkId);
};

const findByToken = async (token) => {
  // First update expired links
  await expireStaleLinks();

  const result = await db.query(
    `SELECT il.*, 
            g.name AS group_name, 
            g.description AS group_description,
            o.org_name AS organization_name,
            o.id AS organization_id
     FROM invite_links il
     JOIN \`groups\` g ON il.group_id = g.id
     JOIN organizations o ON il.created_by = o.id
     WHERE il.token = ? AND il.is_active = TRUE AND il.is_expired = FALSE`,
    [token]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    `SELECT il.*, 
            g.name AS group_name,
            o.org_name AS organization_name,
            o.id AS organization_id
     FROM invite_links il
     JOIN \`groups\` g ON il.group_id = g.id
     JOIN organizations o ON il.created_by = o.id
     WHERE il.id = ?`,
    [id]
  );
  return result.rows[0];
};

const findByGroupId = async (groupId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    `SELECT COUNT(*) AS total 
     FROM invite_links 
     WHERE group_id = ?`,
    [groupId]
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await db.query(
    `SELECT il.*,
            o.org_name AS organization_name,
            o.id AS organization_id
     FROM invite_links il
     JOIN organizations o ON il.created_by = o.id
     WHERE il.group_id = ?
     ORDER BY il.created_at DESC
     LIMIT ? OFFSET ?`,
    [groupId, Number(limit), Number(offset)]
  );

  return {
    inviteLinks: dataResult.rows,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) || 1 }
  };
};

const updateUsage = async (token) => {
  await db.query(
    `UPDATE invite_links 
     SET current_uses = current_uses + 1,
         is_active = CASE 
           WHEN current_uses + 1 >= max_uses THEN FALSE 
           ELSE is_active 
         END,
         updated_at = NOW()
     WHERE token = ? AND is_active = TRUE`,
    [token]
  );
  const result = await db.query('SELECT * FROM invite_links WHERE token = ?', [token]);
  return result.rows[0];
};

const update = async (id, updates) => {
  const fields = [];
  const values = [];

  // Build dynamic update query
  if (updates.expires_at !== undefined) {
    fields.push('expires_at = ?');
    values.push(updates.expires_at);
  }
  if (updates.max_uses !== undefined) {
    fields.push('max_uses = ?');
    values.push(updates.max_uses);
  }
  if (updates.message !== undefined) {
    fields.push('message = ?');
    values.push(updates.message);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);

  await db.query(
    `UPDATE invite_links 
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = ?`,
    values
  );

  return await findById(id);
};

const remove = async (id) => {
  const existing = await findById(id);
  await db.query(`DELETE FROM invite_links WHERE id = ?`, [id]);
  return existing;
};

const isValidToken = async (token) => {
  const inviteLink = await findByToken(token);
  
  if (!inviteLink) {
    return { valid: false, reason: 'Token not found or inactive' };
  }
  
  if (inviteLink.is_expired) {
    return { valid: false, reason: 'Token has been expired' };
  }
  
  if (inviteLink.expires_at && new Date() > new Date(inviteLink.expires_at)) {
    return { valid: false, reason: 'Token has expired' };
  }
  
  if (inviteLink.current_uses >= inviteLink.max_uses) {
    return { valid: false, reason: 'Token has reached usage limit' };
  }
  
  return { valid: true, inviteLink };
};

module.exports = {
  create,
  findByToken,
  findById,
  findByGroupId,
  updateUsage,
  update,
  remove,
  isValidToken,
  expireStaleLinks
};

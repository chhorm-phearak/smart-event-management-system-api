const db = require('../config/db');

const create = async ({
  group_id,
  created_by,
  expires_at = null,
  max_uses = 1,
  message = null,
  token = null
}) => {
  const result = await db.query(
    `INSERT INTO invite_links (
      token, group_id, created_by, expires_at, max_uses, message
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [token, group_id, created_by, expires_at, max_uses, message]
  );
  return result.rows[0];
};

const findByToken = async (token) => {
  // First update expired links
  await db.query('SELECT update_expired_links()');
  
  const result = await db.query(
    `SELECT il.*, 
            g.name AS group_name, 
            g.description AS group_description,
            o.org_name AS organization_name,
            o.id AS organization_id
     FROM invite_links il
     JOIN \`groups\` g ON il.group_id = g.id
     JOIN organizations o ON il.created_by = o.id
     WHERE il.token = $1 AND il.is_active = TRUE AND il.is_expired = FALSE`,
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
     WHERE il.id = $1`,
    [id]
  );
  return result.rows[0];
};

const findByGroupId = async (groupId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  
  const countResult = await db.query(
    `SELECT COUNT(*) AS total 
     FROM invite_links 
     WHERE group_id = $1`,
    [groupId]
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  const dataResult = await db.query(
    `SELECT il.*,
            o.org_name AS organization_name,
            o.id AS organization_id
     FROM invite_links il
     JOIN organizations o ON il.created_by = o.id
     WHERE il.group_id = $1
     ORDER BY il.created_at DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );
  
  return {
    inviteLinks: dataResult.rows,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) || 1 }
  };
};

const updateUsage = async (token) => {
  const result = await db.query(
    `UPDATE invite_links 
     SET current_uses = current_uses + 1,
         is_active = CASE 
           WHEN current_uses + 1 >= max_uses THEN FALSE 
           ELSE is_active 
         END,
         updated_at = NOW()
     WHERE token = $1 AND is_active = TRUE
     RETURNING *`,
    [token]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  // Build dynamic update query
  if (updates.expires_at !== undefined) {
    fields.push(`expires_at = $${paramCount++}`);
    values.push(updates.expires_at);
  }
  if (updates.max_uses !== undefined) {
    fields.push(`max_uses = $${paramCount++}`);
    values.push(updates.max_uses);
  }
  if (updates.message !== undefined) {
    fields.push(`message = $${paramCount++}`);
    values.push(updates.message);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  
  const result = await db.query(
    `UPDATE invite_links 
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
};

const remove = async (id) => {
  const result = await db.query(
    `DELETE FROM invite_links WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
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
  isValidToken
};

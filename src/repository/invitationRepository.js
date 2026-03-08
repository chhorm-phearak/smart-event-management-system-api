const db = require('../config/db');

const create = async ({
  target_type,
  organization_id = null,
  group_id = null,
  invited_user_id = null,
  invited_email = null,
  invited_by,
  role = null,
  message = null,
}) => {
  const result = await db.query(
    `INSERT INTO invitations (
      target_type, organization_id, group_id, invited_user_id, invited_email,
      invited_by, role, message, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
    RETURNING *`,
    [
      target_type,
      organization_id,
      group_id,
      invited_user_id,
      invited_email,
      invited_by,
      role,
      message,
    ]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    `SELECT i.*,
            o.org_name AS organization_name,
            g.name AS group_name
     FROM invitations i
     LEFT JOIN organizations o ON i.organization_id = o.id
     LEFT JOIN groups g ON i.group_id = g.id
     WHERE i.id = $1 AND (i.is_deleted = FALSE OR i.is_deleted IS NULL)`,
    [id]
  );
  return result.rows[0];
};

const getReceivedByUserId = async (userId, { page = 1, limit = 20, status = null } = {}) => {
  const offset = (page - 1) * limit;
  let where = 'i.invited_user_id = $1 AND (i.is_deleted = FALSE OR i.is_deleted IS NULL)';
  const params = [userId];
  if (status) {
    params.push(status);
    where += ` AND i.status = $${params.length}`;
  }
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM invitations i WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  params.push(limit, offset);
  const dataResult = await db.query(
    `SELECT i.*, o.org_name AS organization_name, g.name AS group_name,
            u_inviter.first_name AS inviter_first_name, u_inviter.last_name AS inviter_last_name, u_inviter.email AS inviter_email
     FROM invitations i
     LEFT JOIN organizations o ON i.organization_id = o.id
     LEFT JOIN groups g ON i.group_id = g.id
     LEFT JOIN users u_inviter ON i.invited_by = u_inviter.id
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    invitations: dataResult.rows,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const getSentByUserId = async (userId, { page = 1, limit = 20, status = null } = {}) => {
  const offset = (page - 1) * limit;
  let where = 'i.invited_by = $1 AND (i.is_deleted = FALSE OR i.is_deleted IS NULL)';
  const params = [userId];
  if (status) {
    params.push(status);
    where += ` AND i.status = $${params.length}`;
  }
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM invitations i WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  params.push(limit, offset);
  const dataResult = await db.query(
    `SELECT i.*, o.org_name AS organization_name, g.name AS group_name,
            u.first_name AS invited_first_name, u.last_name AS invited_last_name, u.email AS invited_email
     FROM invitations i
     LEFT JOIN organizations o ON i.organization_id = o.id
     LEFT JOIN groups g ON i.group_id = g.id
     LEFT JOIN users u ON i.invited_user_id = u.id
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    invitations: dataResult.rows,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

/**
 * Update invitation status.
 * @param {string} id - Invitation id
 * @param {string} status - PENDING | ACCEPTED | REJECTED | CANCELLED
 * @param {string} [userId] - For ACCEPTED/REJECTED: must be invited_user_id. For CANCELLED with byInviter: must be invited_by.
 * @param {{ byInviter?: boolean }} [opts] - If { byInviter: true }, restrict update to invited_by = userId (for cancel).
 */
const updateStatus = async (id, status, userId = null, opts = {}) => {
  let query = `UPDATE invitations SET status = $1, updated_at = NOW()`;
  const values = [status];
  if (status === 'ACCEPTED' || status === 'REJECTED') {
    query += `, responded_at = NOW()`;
  }
  query += ` WHERE id = $2 AND (is_deleted = FALSE OR is_deleted IS NULL)`;
  values.push(id);
  if (opts.byInviter && userId != null) {
    values.push(userId);
    query += ` AND invited_by = $${values.length}`;
  } else if (userId != null) {
    values.push(userId);
    query += ` AND invited_user_id = $${values.length}`;
  }
  query += ` RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const findPendingByTargetAndUser = async (targetType, targetId, invitedUserId) => {
  const col = targetType === 'ORGANIZATION' ? 'organization_id' : 'group_id';
  const result = await db.query(
    `SELECT * FROM invitations
     WHERE target_type = $1 AND ${col} = $2 AND invited_user_id = $3 AND status = 'PENDING'
       AND (is_deleted = FALSE OR is_deleted IS NULL)`,
    [targetType, targetId, invitedUserId]
  );
  return result.rows[0];
};

module.exports = {
  create,
  findById,
  getReceivedByUserId,
  getSentByUserId,
  updateStatus,
  findPendingByTargetAndUser,
};

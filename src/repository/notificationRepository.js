const db = require('../config/db');

const create = async ({
  user_id,
  type = 'SYSTEM',
  title,
  message,
  event_id = null,
  organization_id = null,
  group_id = null,
  invitation_id = null,
  actor_user_id = null,
  data = null,
}) => {
  const result = await db.query(
    `INSERT INTO notifications (
      user_id, type, title, message, event_id, organization_id, group_id,
      invitation_id, actor_user_id, data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      user_id,
      type,
      title || null,
      message || null,
      event_id,
      organization_id,
      group_id,
      invitation_id,
      actor_user_id,
      data ? JSON.stringify(data) : null,
    ]
  );
  return result.rows[0];
};

const createMany = async (rows) => {
  if (!rows || rows.length === 0) return [];
  const created = [];
  for (const row of rows) {
    const n = await create(row);
    created.push(n);
  }
  return created;
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM notifications WHERE id = $1 AND (is_deleted = FALSE OR is_deleted IS NULL)',
    [id]
  );
  return result.rows[0];
};

const getByUserId = async (userId, { page = 1, limit = 20, is_read = null } = {}) => {
  const offset = (page - 1) * limit;
  let where = 'user_id = $1 AND (n.is_deleted = FALSE OR n.is_deleted IS NULL)';
  const params = [userId];
  if (is_read !== null && is_read !== undefined) {
    params.push(is_read);
    where += ` AND n.is_read = $${params.length}`;
  }
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM notifications n WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  params.push(limit, offset);
  const dataResult = await db.query(
    `SELECT n.* FROM notifications n
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    notifications: dataResult.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const markAsRead = async (id, userId) => {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND (is_deleted = FALSE OR is_deleted IS NULL)
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
};

const markAllAsRead = async (userId) => {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, NOW()), updated_at = NOW()
     WHERE user_id = $1 AND (is_deleted = FALSE OR is_deleted IS NULL) AND (is_read = FALSE OR is_read IS NULL)
     RETURNING id`,
    [userId]
  );
  return result.rowCount;
};

const getUnreadCount = async (userId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count FROM notifications
     WHERE user_id = $1 AND (is_deleted = FALSE OR is_deleted IS NULL) AND (is_read = FALSE OR is_read IS NULL)`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

module.exports = {
  create,
  createMany,
  findById,
  getByUserId,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};

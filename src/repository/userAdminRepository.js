const db = require('../config/db');

const getUserAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*) AS total_users,
      COALESCE(SUM(u.status = 'ACTIVE'), 0) AS total_active,
      COALESCE(SUM(u.status = 'INACTIVE'), 0) AS total_inactive,
      COALESCE(SUM(u.status = 'SUSPENDED'), 0) AS total_suspended
    FROM users u
    WHERE u.is_deleted = FALSE
  `);
  const row = result.rows[0];
  return {
    total_users: parseInt(row.total_users, 10),
    total_active: parseInt(row.total_active, 10),
    total_inactive: parseInt(row.total_inactive, 10),
    total_suspended: parseInt(row.total_suspended, 10),
  };
};

const getAllUsers = async ({ search, status, role_id, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = ['u.is_deleted = FALSE'];

  if (search) {
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
  }

  if (status) {
    values.push(status);
    conditions.push('u.status = ?');
  }

  if (role_id) {
    values.push(role_id);
    conditions.push('u.role_id = ?');
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get users with pagination
  values.push(Number(limit));
  values.push(Number(offset));

  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.gender,
      u.status,
      u.role_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.user_id = u.id
            AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
        ) THEN 'Organization'
      END AS role,
      u.created_at,
      u.updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?`,
    values
  );

  return {
    users: result.rows,
    total,
    limit,
    offset,
  };
};

const getUserById = async (userId) => {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.gender,
      u.status,
      u.role_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.user_id = u.id
            AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
        ) THEN 'Organization'
      END AS role,
      u.created_at,
      u.updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE u.id = ? AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const updateUserStatus = async (userId, status) => {
  await db.query(
    `UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND is_deleted = FALSE`,
    [status, userId]
  );
  const result = await db.query('SELECT * FROM users WHERE id = ? AND is_deleted = FALSE', [userId]);
  return result.rows[0];
};

const updateUserRole = async (userId, roleId) => {
  await db.query(
    `UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ? AND is_deleted = FALSE`,
    [roleId, userId]
  );
  const result = await db.query('SELECT * FROM users WHERE id = ? AND is_deleted = FALSE', [userId]);
  return result.rows[0];
};

const deleteUser = async (userId) => {
  await db.query(
    `UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = ?`,
    [userId]
  );
  const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  return result.rows[0];
};

module.exports = {
  getUserAdminStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
};

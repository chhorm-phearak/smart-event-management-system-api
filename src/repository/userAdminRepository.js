const db = require('../config/db');

const getUserAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE u.status = 'ACTIVE')::int AS total_active,
      COUNT(*) FILTER (WHERE u.status = 'INACTIVE')::int AS total_inactive,
      COUNT(*) FILTER (WHERE u.status = 'SUSPENDED')::int AS total_suspended
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
    conditions.push(`(u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`u.status = $${values.length}`);
  }

  if (role_id) {
    values.push(role_id);
    conditions.push(`u.role_id = $${values.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get users with pagination
  values.push(limit);
  values.push(offset);

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
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
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
    WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const updateUserStatus = async (userId, status) => {
  const result = await db.query(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
    [status, userId]
  );
  return result.rows[0];
};

const updateUserRole = async (userId, roleId) => {
  const result = await db.query(
    `UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
    [roleId, userId]
  );
  return result.rows[0];
};

const deleteUser = async (userId) => {
  const result = await db.query(
    `UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId]
  );
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

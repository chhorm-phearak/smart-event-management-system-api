const db = require('../config/db');

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
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
};

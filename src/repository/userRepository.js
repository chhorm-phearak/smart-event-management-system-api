const db = require('../config/db');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [email]
  );
  return result.rows[0];
};

const findByUsername = async (username) => {
  const result = await db.query(
    'SELECT * FROM users WHERE username = $1 AND is_deleted = FALSE',
    [username]
  );
  return result.rows[0];
};

const createUser = async ({ role_id, first_name, last_name, email, password }) => {
  const result = await db.query(
    `INSERT INTO users (role_id, first_name, last_name, email, password)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [role_id, first_name, last_name, email, password]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE',
    [id]
  );
  return result.rows[0];
};

const updatePassword = async (userId, hashedPassword) => {
  await db.query('UPDATE users SET password = $1 WHERE id = $2', [
    hashedPassword,
    userId,
  ]);
};

const createUserProfile = async (userId, { first_name, last_name, email, contact }) => {
  const result = await db.query(
    `INSERT INTO user_profile (user_id, first_name, last_name, email, contact)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       contact = EXCLUDED.contact,
       updated_at = NOW()
     RETURNING *`,
    [userId, first_name, last_name, email, contact]
  );
  return result.rows[0];
};

const updateProfile = async (userId, { first_name, last_name, email }) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (first_name !== undefined) {
    updates.push(`first_name = $${paramCount++}`);
    values.push(first_name);
  }
  if (last_name !== undefined) {
    updates.push(`last_name = $${paramCount++}`);
    values.push(last_name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(email);
  }

  if (updates.length === 0) {
    // Return current user if no updates
    return await findById(userId);
  }

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const getUserProfile = async (userId) => {
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
      up.date_of_birth,
      up.created_at as profile_created_at,
      up.updated_at as profile_updated_at
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const listUsers = async ({ search, limit = 10, offset = 0 } = {}) => {
  const values = [];
  let whereClause = 'is_deleted = FALSE';

  if (search) {
    values.push(`%${search}%`);
    whereClause += ` AND full_name ILIKE $${values.length}`;
  }

  values.push(limit);
  values.push(offset);

  const limitIndex = values.length - 1;
  const offsetIndex = values.length;

  const result = await db.query(
    `SELECT id, full_name, first_name, last_name, email, status, role_id
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return result.rows;
};

const searchUsersByEmail = async ({ email, limit = 10, offset = 0 } = {}) => {
  if (!email || !email.trim()) {
    return [];
  }
  const result = await db.query(
    `SELECT id, full_name, first_name, last_name, email, status, role_id
     FROM users
     WHERE is_deleted = FALSE AND email ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${email.trim()}%`, limit, offset]
  );
  return result.rows;
};

module.exports = {
  findByEmail,
  findByUsername,
  createUser,
  findById,
  updatePassword,
  updateProfile,
  createUserProfile,
  getUserProfile,
  listUsers,
  searchUsersByEmail,
};






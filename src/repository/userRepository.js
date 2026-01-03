const db = require('../config/db');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [email]
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

module.exports = {
  findByEmail,
  createUser,
  findById,
  updatePassword,
  updateProfile,
  createUserProfile,
};






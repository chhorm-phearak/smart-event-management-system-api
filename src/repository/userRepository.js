const db = require('../config/db');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [email]
  );
  return result.rows[0];
};

const createUser = async ({ role_id, full_name, email, password, phone }) => {
  const result = await db.query(
    `INSERT INTO users (role_id, full_name, email, password, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [role_id, full_name, email, password, phone]
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

const updateProfile = async (userId, { full_name, email, phone }) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (full_name !== undefined) {
    updates.push(`full_name = $${paramCount++}`);
    values.push(full_name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(email);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramCount++}`);
    values.push(phone);
  }

  if (updates.length === 0) {
    // Return current user if no updates
    return await findById(userId);
  }

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  findByEmail,
  createUser,
  findById,
  updatePassword,
  updateProfile,
};






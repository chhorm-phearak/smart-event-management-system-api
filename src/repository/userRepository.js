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

module.exports = {
  findByEmail,
  createUser,
  findById,
  updatePassword,
};






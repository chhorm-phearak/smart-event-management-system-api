const db = require('../config/db');
const { newId } = require('../utils/uuid');

const createResetToken = async (userId, resetToken, expiresAt) => {
  await db.query(
    `INSERT INTO password_resets (id, user_id, reset_token, expires_at)
     VALUES (?, ?, ?, ?)`,
    [newId(), userId, resetToken, expiresAt]
  );
};

const findValidResetRecord = async (resetToken) => {
  const result = await db.query(
    `SELECT pr.*, u.id as user_id
     FROM password_resets pr
     JOIN users u ON pr.user_id = u.id
     WHERE pr.reset_token = ? AND pr.used = FALSE AND u.is_deleted = FALSE`,
    [resetToken]
  );
  return result.rows[0];
};

const markUsed = async (id) => {
  await db.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [id]);
};

module.exports = {
  createResetToken,
  findValidResetRecord,
  markUsed,
};





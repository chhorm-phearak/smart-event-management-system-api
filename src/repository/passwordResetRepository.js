const db = require('../config/db');

const createResetToken = async (userId, resetToken, expiresAt) => {
  await db.query(
    `INSERT INTO password_resets (user_id, reset_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, resetToken, expiresAt]
  );
};

const findValidResetRecord = async (resetToken) => {
  const result = await db.query(
    `SELECT pr.*, u.id as user_id
     FROM password_resets pr
     JOIN users u ON pr.user_id = u.id
     WHERE pr.reset_token = $1 AND pr.used = FALSE AND u.is_deleted = FALSE`,
    [resetToken]
  );
  return result.rows[0];
};

const markUsed = async (id) => {
  await db.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
};

const invalidateExistingTokens = async (userId) => {
  await db.query(
    'DELETE FROM password_resets WHERE user_id = $1 AND used = FALSE',
    [userId]
  );
};

module.exports = {
  createResetToken,
  findValidResetRecord,
  markUsed,
  invalidateExistingTokens,
};





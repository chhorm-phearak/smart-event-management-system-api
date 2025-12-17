const db = require('../config/db');

const ensureTable = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      reset_token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users (id)
    )`
  );
};

const createResetToken = async (userId, resetToken, expiresAt) => {
  await ensureTable();
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
     WHERE pr.reset_token = $1 AND pr.used = FALSE`,
    [resetToken]
  );
  return result.rows[0];
};

const markUsed = async (id) => {
  await db.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
};

module.exports = {
  createResetToken,
  findValidResetRecord,
  markUsed,
};



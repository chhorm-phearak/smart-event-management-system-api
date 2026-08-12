const db = require('../config/db');

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_STEP_MINUTES = 5;

/**
 * Progressive account lockout, previously implemented as the Postgres
 * handle_failed_login/handle_successful_login/is_account_locked/
 * get_lockout_remaining_minutes functions.
 */
const handleFailedLogin = async (email) => {
  const result = await db.query(
    'SELECT failed_login_attempts, lockout_count FROM users WHERE email = ?',
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    return;
  }

  const failedAttempts = (user.failed_login_attempts || 0) + 1;

  await db.query(
    'UPDATE users SET failed_login_attempts = ?, last_failed_login = NOW() WHERE email = ?',
    [failedAttempts, email]
  );

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutCount = (user.lockout_count || 0) + 1;
    await db.query(
      `UPDATE users
       SET account_locked = TRUE,
           lockout_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
           lockout_count = ?
       WHERE email = ?`,
      [LOCKOUT_STEP_MINUTES * lockoutCount, lockoutCount, email]
    );
  }
};

const handleSuccessfulLogin = async (email) => {
  await db.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         account_locked = FALSE,
         lockout_count = 0
     WHERE email = ?`,
    [email]
  );
};

const isAccountLocked = async (email) => {
  const result = await db.query(
    'SELECT account_locked, lockout_until FROM users WHERE email = ?',
    [email]
  );
  const user = result.rows[0];
  if (!user || !user.account_locked) {
    return false;
  }

  if (user.lockout_until && new Date(user.lockout_until) < new Date()) {
    await db.query(
      'UPDATE users SET account_locked = FALSE, failed_login_attempts = 0 WHERE email = ?',
      [email]
    );
    return false;
  }

  return true;
};

const getLockoutRemainingMinutes = async (email) => {
  const result = await db.query(
    'SELECT lockout_until FROM users WHERE email = ? AND account_locked = TRUE',
    [email]
  );
  const user = result.rows[0];
  if (!user || !user.lockout_until) {
    return 0;
  }

  const remainingMs = new Date(user.lockout_until).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / 60000);
};

module.exports = {
  handleFailedLogin,
  handleSuccessfulLogin,
  isAccountLocked,
  getLockoutRemainingMinutes,
};

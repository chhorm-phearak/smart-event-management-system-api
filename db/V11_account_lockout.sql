-- =====================================================
-- ACCOUNT LOCKOUT SECURITY
-- =====================================================
-- Progressive lockout: 5min, 10min, 15min, 20min...
-- The lockout logic itself lives in the application
-- (src/repository/accountLockoutRepository.js) instead of stored functions.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lockout_until DATETIME,
ADD COLUMN IF NOT EXISTS last_failed_login DATETIME,
ADD COLUMN IF NOT EXISTS lockout_count INT DEFAULT 0;

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked);
CREATE INDEX IF NOT EXISTS idx_users_lockout_until ON users(lockout_until);

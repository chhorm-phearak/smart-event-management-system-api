-- =====================================================
-- ACCOUNT LOCKOUT SECURITY (MySQL / MariaDB port of V11)
-- =====================================================
-- Progressive lockout: 5min, 10min, 15min, 20min...
-- Run once against the application database, e.g.
--   mysql -u root event_management_db_v2 < db/V11_account_lockout_mysql.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_locked TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockout_until DATETIME NULL,
  ADD COLUMN IF NOT EXISTS last_failed_login DATETIME NULL,
  ADD COLUMN IF NOT EXISTS lockout_count INT DEFAULT 0;

DROP FUNCTION IF EXISTS handle_failed_login;
DROP FUNCTION IF EXISTS handle_successful_login;
DROP FUNCTION IF EXISTS is_account_locked;
DROP FUNCTION IF EXISTS get_lockout_remaining_minutes;

DELIMITER $$

CREATE FUNCTION handle_failed_login(p_email VARCHAR(255))
RETURNS INT
MODIFIES SQL DATA
BEGIN
    DECLARE v_attempts INT DEFAULT NULL;
    DECLARE v_lockout_count INT DEFAULT 0;

    SELECT failed_login_attempts, COALESCE(lockout_count, 0)
      INTO v_attempts, v_lockout_count
      FROM users WHERE email = p_email LIMIT 1;

    IF v_attempts IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           last_failed_login = NOW()
     WHERE email = p_email;

    IF v_attempts + 1 >= 3 THEN
        UPDATE users
           SET account_locked = 1,
               lockout_until = NOW() + INTERVAL (5 * (v_lockout_count + 1)) MINUTE,
               lockout_count = v_lockout_count + 1
         WHERE email = p_email;
    END IF;

    RETURN v_attempts + 1;
END$$

CREATE FUNCTION handle_successful_login(p_email VARCHAR(255))
RETURNS INT
MODIFIES SQL DATA
BEGIN
    UPDATE users
       SET failed_login_attempts = 0,
           account_locked = 0,
           lockout_count = 0,
           lockout_until = NULL
     WHERE email = p_email;
    RETURN 1;
END$$

CREATE FUNCTION is_account_locked(p_email VARCHAR(255))
RETURNS TINYINT(1)
MODIFIES SQL DATA
BEGIN
    DECLARE v_locked TINYINT(1) DEFAULT NULL;
    DECLARE v_until DATETIME DEFAULT NULL;

    SELECT account_locked, lockout_until
      INTO v_locked, v_until
      FROM users WHERE email = p_email LIMIT 1;

    IF v_locked IS NULL OR v_locked = 0 THEN
        RETURN 0;
    END IF;

    IF v_until IS NULL OR v_until < NOW() THEN
        UPDATE users
           SET account_locked = 0,
               failed_login_attempts = 0
         WHERE email = p_email;
        RETURN 0;
    END IF;

    RETURN 1;
END$$

CREATE FUNCTION get_lockout_remaining_minutes(p_email VARCHAR(255))
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_seconds INT DEFAULT NULL;

    SELECT TIMESTAMPDIFF(SECOND, NOW(), lockout_until)
      INTO v_seconds
      FROM users
     WHERE email = p_email AND account_locked = 1
     LIMIT 1;

    IF v_seconds IS NULL OR v_seconds < 0 THEN
        RETURN 0;
    END IF;

    RETURN CEIL(v_seconds / 60);
END$$

DELIMITER ;

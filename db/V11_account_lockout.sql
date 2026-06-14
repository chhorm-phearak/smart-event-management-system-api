-- =====================================================
-- ACCOUNT LOCKOUT SECURITY
-- =====================================================
-- Progressive lockout: 5min, 10min, 15min, 20min...

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS lockout_count INTEGER DEFAULT 0;

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked);
CREATE INDEX IF NOT EXISTS idx_users_lockout_until ON users(lockout_until);

-- Function to handle failed login attempt
CREATE OR REPLACE FUNCTION handle_failed_login(p_email VARCHAR)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
    user_email VARCHAR;
    failed_attempts INTEGER;
    is_locked BOOLEAN;
    lockout_time TIMESTAMP;
    lockout_counter INTEGER;
BEGIN
    -- Get current user state
    SELECT id, email, failed_login_attempts, account_locked, lockout_until, lockout_count 
    INTO user_id, user_email, failed_attempts, is_locked, lockout_time, lockout_counter 
    FROM users WHERE email = p_email;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1,
        last_failed_login = NOW()
    WHERE email = p_email;
    
    -- Check if should lock account (3+ failed attempts)
    IF failed_attempts + 1 >= 3 THEN
        -- Lock the account with progressive timeout (5, 10, 15, 20... minutes)
        UPDATE users 
        SET account_locked = TRUE,
            lockout_until = NOW() + INTERVAL '5 minutes' * (lockout_counter + 1),
            lockout_count = lockout_counter + 1
        WHERE email = p_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to handle successful login (reset lockout state)
CREATE OR REPLACE FUNCTION handle_successful_login(p_email VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = 0,
        account_locked = FALSE,
        lockout_count = 0
    WHERE email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    is_locked BOOLEAN;
    lockout_expired BOOLEAN;
BEGIN
    -- Check if account is marked as locked
    SELECT account_locked INTO is_locked 
    FROM users 
    WHERE email = p_email;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- If not locked, return FALSE
    IF NOT is_locked THEN
        RETURN FALSE;
    END IF;
    
    -- Check if lockout has expired
    SELECT lockout_until < NOW() INTO lockout_expired
    FROM users 
    WHERE email = p_email;
    
    -- If lockout expired, automatically unlock
    IF lockout_expired THEN
        UPDATE users 
        SET account_locked = FALSE,
            failed_login_attempts = 0
        WHERE email = p_email;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get remaining lockout time in minutes
CREATE OR REPLACE FUNCTION get_lockout_remaining_minutes(p_email VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    remaining_seconds NUMERIC;
BEGIN
    SELECT EXTRACT(EPOCH FROM (lockout_until - NOW())) INTO remaining_seconds
    FROM users 
    WHERE email = p_email AND account_locked = TRUE;
    
    IF remaining_seconds IS NULL OR remaining_seconds < 0 THEN
        RETURN 0;
    END IF;
    
    RETURN CEIL(remaining_seconds / 60);
END;
$$ LANGUAGE plpgsql;

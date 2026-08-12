-- =====================================================
-- EMAIL VERIFICATION COLUMNS
-- =====================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires_at DATETIME;

-- Update existing users to be verified (optional - for existing accounts)
-- UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

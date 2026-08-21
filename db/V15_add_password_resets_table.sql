-- =====================================================
-- ADD PASSWORD RESETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    reset_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

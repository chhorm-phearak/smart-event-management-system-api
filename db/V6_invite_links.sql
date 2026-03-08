-- =====================================================
-- V6: Invite Links for Groups
-- =====================================================
-- Purpose: Add shareable invite links for groups

-- =====================================================
-- INVITE LINKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invite_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    group_id UUID NOT NULL,
    created_by UUID NOT NULL, -- organization_id instead of user_id
    expires_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_expired BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_invite_link_group
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_link_creator
        FOREIGN KEY (created_by) REFERENCES organizations(id), -- Changed to organizations table
    CONSTRAINT ck_invite_link_max_uses
        CHECK (max_uses > 0),
    CONSTRAINT ck_invite_link_current_uses
        CHECK (current_uses >= 0),
    CONSTRAINT ck_invite_link_usage_limit
        CHECK (current_uses <= max_uses)
);

-- Handle existing tables that might not have the is_expired column
DO $$
BEGIN
    -- Check if the table exists and add missing columns if needed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_links') THEN
        -- Add is_expired column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'invite_links' AND column_name = 'is_expired') THEN
            ALTER TABLE invite_links ADD COLUMN is_expired BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_group_id ON invite_links(group_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_is_active ON invite_links(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_links_is_expired ON invite_links(is_expired);
CREATE INDEX IF NOT EXISTS idx_invite_links_expires_at ON invite_links(expires_at);

-- Function to expire all existing links for a group when new link is created
CREATE OR REPLACE FUNCTION expire_existing_group_links()
RETURNS TRIGGER AS $$
BEGIN
    -- Expire all existing active links for this group
    UPDATE invite_links 
    SET is_expired = TRUE, is_active = FALSE, updated_at = NOW()
    WHERE group_id = NEW.group_id 
    AND is_active = TRUE 
    AND is_expired = FALSE
    AND id != NEW.id; -- Don't expire the newly created link
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR(64) AS $$
DECLARE
    new_token VARCHAR(64);
    exists BOOLEAN;
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
    LOOP
        -- Generate a 64-character random string
        new_token := '';
        FOR i IN 1..64 LOOP
            new_token := new_token || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if token already exists (using table alias to avoid ambiguity)
        SELECT EXISTS(SELECT 1 FROM invite_links il WHERE il.token = new_token) INTO exists;
        
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate token on insert and expire previous links
CREATE OR REPLACE FUNCTION set_invite_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token IS NULL OR NEW.token = '' THEN
        NEW.token := generate_invite_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invite_token ON invite_links;
CREATE TRIGGER trg_set_invite_token
    BEFORE INSERT ON invite_links
    FOR EACH ROW
    EXECUTE FUNCTION set_invite_token();

-- Trigger to expire existing links when new link is created
DROP TRIGGER IF EXISTS trg_expire_existing_links ON invite_links;
CREATE TRIGGER trg_expire_existing_links
    AFTER INSERT ON invite_links
    FOR EACH ROW
    EXECUTE FUNCTION expire_existing_group_links();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invite_link_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invite_link_timestamp ON invite_links;
CREATE TRIGGER trg_update_invite_link_timestamp
    BEFORE UPDATE ON invite_links
    FOR EACH ROW
    EXECUTE FUNCTION update_invite_link_timestamp();

-- Function to check and update expired links
CREATE OR REPLACE FUNCTION update_expired_links()
RETURNS VOID AS $$
BEGIN
    -- Mark links as expired if they've reached max uses or passed expiration date
    UPDATE invite_links 
    SET is_expired = TRUE, is_active = FALSE, updated_at = NOW()
    WHERE is_expired = FALSE 
    AND (
        (expires_at IS NOT NULL AND expires_at < NOW()) OR
        (current_uses >= max_uses)
    );
END;
$$ LANGUAGE plpgsql;

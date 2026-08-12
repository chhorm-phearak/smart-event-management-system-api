-- =====================================================
-- V6: Invite Links for Groups
-- =====================================================
-- Purpose: Add shareable invite links for groups
-- Token generation and link expiry (previously plpgsql triggers/functions)
-- are handled in src/repository/inviteLinkRepository.js.

-- =====================================================
-- INVITE LINKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invite_links (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    group_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL, -- organization_id instead of user_id
    expires_at DATETIME,
    max_uses INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_expired BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invite_link_group
        FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
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
ALTER TABLE invite_links ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_group_id ON invite_links(group_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_is_active ON invite_links(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_links_is_expired ON invite_links(is_expired);
CREATE INDEX IF NOT EXISTS idx_invite_links_expires_at ON invite_links(expires_at);

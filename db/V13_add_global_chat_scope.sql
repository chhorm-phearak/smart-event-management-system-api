-- =====================================================
-- ADD GLOBAL CHAT SCOPE TO EXISTING TABLES
-- =====================================================
-- This migration adds scope column to support both group and global chat

-- =====================================================
-- ADD SCOPE TO CHAT MESSAGES
-- =====================================================
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'group'
    CHECK (scope IN ('group', 'global'));

-- Make group_id nullable for global messages
ALTER TABLE chat_messages 
MODIFY COLUMN group_id CHAR(36) NULL;

-- Update existing records to have scope='group'
UPDATE chat_messages 
SET scope = 'group' 
WHERE scope IS NULL OR scope = 'group';

-- Add index for scope queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_scope ON chat_messages(scope);
CREATE INDEX IF NOT EXISTS idx_chat_messages_scope_created 
    ON chat_messages(scope, created_at DESC);

-- =====================================================
-- ADD SCOPE TO CHAT MESSAGE FILES
-- =====================================================
ALTER TABLE chat_message_files 
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'group'
    CHECK (scope IN ('group', 'global'));

-- Update existing records to have scope='group'
UPDATE chat_message_files 
SET scope = 'group' 
WHERE scope IS NULL OR scope = 'group';

-- Add index for scope queries
CREATE INDEX IF NOT EXISTS idx_chat_message_files_scope ON chat_message_files(scope);

-- =====================================================
-- ADD SCOPE TO CHAT MESSAGE READS
-- =====================================================
ALTER TABLE chat_message_reads 
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'group'
    CHECK (scope IN ('group', 'global'));

-- Update existing records to have scope='group'
UPDATE chat_message_reads 
SET scope = 'group' 
WHERE scope IS NULL OR scope = 'group';

-- Add index for scope queries
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_scope ON chat_message_reads(scope);

-- =====================================================
-- GLOBAL CHAT IMPLEMENTATION NOTE
-- =====================================================
-- Global chat uses scope='global' in chat_messages table
-- No group entry needed since global chat is organization-independent
-- All authenticated users can access global chat regardless of organization

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================
-- Create view for global messages
CREATE OR REPLACE VIEW global_chat_messages AS
SELECT 
    id,
    sender_id,
    content,
    message_type,
    reply_to_id,
    is_edited,
    is_deleted,
    created_at,
    updated_at
FROM chat_messages 
WHERE scope = 'global' AND is_deleted = FALSE;

-- Create view for group messages
CREATE OR REPLACE VIEW group_chat_messages AS
SELECT 
    id,
    group_id,
    sender_id,
    content,
    message_type,
    reply_to_id,
    is_edited,
    is_deleted,
    created_at,
    updated_at
FROM chat_messages 
WHERE scope = 'group' AND is_deleted = FALSE;

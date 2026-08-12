-- =====================================================
-- ADD IMAGE COLUMN TO GROUPS TABLE - V7
-- =====================================================

-- Add image_url column to groups table
ALTER TABLE `groups`
ADD COLUMN IF NOT EXISTS image_url TEXT COMMENT 'URL to the group profile image';

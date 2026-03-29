-- =====================================================
-- ADD IMAGE COLUMN TO GROUPS TABLE - V7
-- =====================================================

-- Add image_url column to groups table
ALTER TABLE groups 
ADD COLUMN image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN groups.image_url IS 'URL to the group profile image';

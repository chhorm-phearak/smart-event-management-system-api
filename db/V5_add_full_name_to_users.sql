-- =====================================================
-- V5: Add full_name column to users
-- =====================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);

-- Optional backfill: combine first_name and last_name into full_name
UPDATE users
SET full_name = TRIM(CONCAT_WS(' ', first_name, last_name))
WHERE full_name IS NULL;


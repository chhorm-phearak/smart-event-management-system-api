-- =====================================================
-- V9: Add status column to event registrations
-- =====================================================
-- Adds a status column to track attendee registration lifecycle
-- Values: REGISTERED (default), CHECKED_IN, CANCELLED

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED'
    COMMENT 'Attendee registration status (REGISTERED, CHECKED_IN, CANCELLED)';

ALTER TABLE event_registrations
ADD CONSTRAINT chk_event_registrations_status
CHECK (status IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED'));

-- Ensure existing rows fall back to default
UPDATE event_registrations
SET status = 'REGISTERED'
WHERE status IS NULL;

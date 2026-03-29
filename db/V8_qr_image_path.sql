-- =====================================================
-- V8: Add QR Image Path Column to Event Registrations
-- =====================================================
-- This migration adds a column to store the file path of QR code images
-- instead of generating base64 images on every API call

ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS qr_image_path TEXT;

-- Add comment to column
COMMENT ON COLUMN event_registrations.qr_image_path IS 'File path to stored QR code image (e.g., /qr-codes/qr-uuid.png)';

-- Create index for faster lookups by qr_image_path
CREATE INDEX IF NOT EXISTS idx_event_registrations_qr_image_path 
ON event_registrations(qr_image_path) 
WHERE qr_image_path IS NOT NULL;

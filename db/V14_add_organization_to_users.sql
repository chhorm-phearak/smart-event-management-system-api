-- =====================================================
-- V14: Add organization field to users
-- =====================================================
-- Purpose:
-- Allow storing an organization name directly on the user record,
-- accepted at registration.

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(200);

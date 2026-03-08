-- =====================================================
-- V4: Invitations + Notification upgrade
-- =====================================================
-- Purpose:
-- 1) Add invitation workflow table (source of truth for invite status)
-- 2) Extend notifications for multiple domains (event/group/org/invite)

-- =====================================================
-- INVITATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(20) NOT NULL, -- ORGANIZATION | GROUP
    organization_id UUID,
    group_id UUID,
    invited_user_id UUID,
    invited_email VARCHAR(150),
    invited_by UUID NOT NULL,
    role VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | REJECTED | CANCELLED
    message TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_invitation_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_invitation_group
        FOREIGN KEY (group_id) REFERENCES groups(id),
    CONSTRAINT fk_invitation_user
        FOREIGN KEY (invited_user_id) REFERENCES users(id),
    CONSTRAINT fk_invitation_sender
        FOREIGN KEY (invited_by) REFERENCES users(id),
    CONSTRAINT ck_invitation_target_type
        CHECK (target_type IN ('ORGANIZATION', 'GROUP')),
    CONSTRAINT ck_invitation_status
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_invitation_target_ref
        CHECK (
            (target_type = 'ORGANIZATION' AND organization_id IS NOT NULL AND group_id IS NULL) OR
            (target_type = 'GROUP' AND group_id IS NOT NULL AND organization_id IS NULL)
        ),
    CONSTRAINT ck_invitation_recipient
        CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
);

-- Prevent duplicate active invites for same user/email + target.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_pending_org_user
ON invitations (organization_id, invited_user_id)
WHERE target_type = 'ORGANIZATION'
  AND invited_user_id IS NOT NULL
  AND status = 'PENDING'
  AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_pending_group_user
ON invitations (group_id, invited_user_id)
WHERE target_type = 'GROUP'
  AND invited_user_id IS NOT NULL
  AND status = 'PENDING'
  AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_pending_org_email
ON invitations (organization_id, invited_email)
WHERE target_type = 'ORGANIZATION'
  AND invited_email IS NOT NULL
  AND status = 'PENDING'
  AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_pending_group_email
ON invitations (group_id, invited_email)
WHERE target_type = 'GROUP'
  AND invited_email IS NOT NULL
  AND status = 'PENDING'
  AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_invitations_invited_user_id ON invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_email ON invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at DESC);

-- =====================================================
-- NOTIFICATIONS UPGRADE
-- =====================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS invitation_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_notification_actor_user'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notification_actor_user
            FOREIGN KEY (actor_user_id) REFERENCES users(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_notification_org'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notification_org
            FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_notification_group'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notification_group
            FOREIGN KEY (group_id) REFERENCES groups(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_notification_invitation'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notification_invitation
            FOREIGN KEY (invitation_id) REFERENCES invitations(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_invitation_id ON notifications(invitation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

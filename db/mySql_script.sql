-- =====================================================
-- MySQL merged schema
-- Converted from PostgreSQL migrations in db/
-- =====================================================
-- Run against an existing MySQL 8.0+ database, either from the command line
--   mysql -u <user> -p <database> < db/mySql_script.sql
-- or from MySQL Workbench (File > Open SQL Script, then Execute).
-- Notes:
--   - Plain MySQL 8.0 syntax only: no MariaDB-only constructs such as
--     DROP INDEX IF EXISTS or writable stored functions.
--   - Re-runnable: every object is created only when it is missing.
--   - UUID columns use VARCHAR(36). The triggers below auto-generate
--     a UUID() when id is left NULL/empty.
--   - PostgreSQL partial indexes are approximated as best-effort.
--   - MySQL does not allow a trigger to UPDATE the same table it fires
--     on, so the invite-links "expire existing" trigger is replaced by
--     comments + a periodic cleanup procedure.
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS `roles` (
    role_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `roles` (role_id, name, description) VALUES
('user_role', 'User', 'Regular user with standard permissions'),
('admin_role', 'Administrator', 'System administrator with full access');

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    full_name VARCHAR(200) DEFAULT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    `password` TEXT NOT NULL,
    gender VARCHAR(20) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    role_id VARCHAR(50) NOT NULL DEFAULT 'user_role',
    email_verified BOOLEAN DEFAULT 0,
    email_verification_token TEXT,
    email_verification_expires_at DATETIME DEFAULT NULL,
    failed_login_attempts INT DEFAULT 0,
    account_locked BOOLEAN DEFAULT 0,
    lockout_until DATETIME DEFAULT NULL,
    last_failed_login DATETIME DEFAULT NULL,
    lockout_count INT DEFAULT 0,
    organization VARCHAR(200) DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES `roles`(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- USER PROFILE
-- =====================================================
CREATE TABLE IF NOT EXISTS `user_profile` (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    img_url TEXT,
    contact VARCHAR(50) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    gender VARCHAR(20) DEFAULT NULL,
    address TEXT,
    date_of_birth DATE DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES `users`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- ORGANIZATION APPLICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS `organization_applications` (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    org_name VARCHAR(150) NOT NULL,
    org_type VARCHAR(50) DEFAULT NULL,
    contact VARCHAR(50) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    reviewed_by VARCHAR(36) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_app_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT fk_org_app_reviewer FOREIGN KEY (reviewed_by) REFERENCES `users`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS `organizations` (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    org_name VARCHAR(150) NOT NULL,
    org_type VARCHAR(50) DEFAULT NULL,
    contact VARCHAR(50) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_owner FOREIGN KEY (user_id) REFERENCES `users`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS `organization_members` (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    CONSTRAINT fk_org_member_org FOREIGN KEY (organization_id) REFERENCES `organizations`(id),
    CONSTRAINT fk_org_member_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- GROUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS `groups` (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_by VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_org FOREIGN KEY (organization_id) REFERENCES `organizations`(id),
    CONSTRAINT fk_group_creator FOREIGN KEY (created_by) REFERENCES `users`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- GROUP MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS `group_members` (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS `events` (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36) DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    category VARCHAR(50) DEFAULT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INT DEFAULT NULL,
    capacity INT DEFAULT NULL,
    location VARCHAR(200) DEFAULT NULL,
    full_address TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT',
    is_public BOOLEAN DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_org FOREIGN KEY (organization_id) REFERENCES `organizations`(id),
    CONSTRAINT fk_event_group FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES `users`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT AGENDA
-- =====================================================
CREATE TABLE IF NOT EXISTS `event_agenda` (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) DEFAULT NULL,
    description TEXT,
    start_time DATETIME DEFAULT NULL,
    end_time DATETIME DEFAULT NULL,
    duration INT DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_agenda_event FOREIGN KEY (event_id) REFERENCES `events`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT REGISTRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS `event_registrations` (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    qr_code TEXT NOT NULL,
    qr_image_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registration_event FOREIGN KEY (event_id) REFERENCES `events`(id),
    CONSTRAINT fk_registration_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT uq_event_registration UNIQUE (event_id, user_id),
    CONSTRAINT chk_event_registrations_status CHECK (status IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- ATTENDANCE LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS `attendance_logs` (
    id VARCHAR(36) PRIMARY KEY,
    registration_id VARCHAR(36) NOT NULL,
    scanned_by VARCHAR(36) NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'CHECKED_IN',
    CONSTRAINT fk_attendance_registration FOREIGN KEY (registration_id) REFERENCES `event_registrations`(id),
    CONSTRAINT fk_attendance_staff FOREIGN KEY (scanned_by) REFERENCES `users`(id),
    CONSTRAINT uq_attendance UNIQUE (registration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT STAFF
-- =====================================================
CREATE TABLE IF NOT EXISTS `event_staff` (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    organization_member_id VARCHAR(36) NOT NULL,
    `role` VARCHAR(50) DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_event FOREIGN KEY (event_id) REFERENCES `events`(id),
    CONSTRAINT fk_staff_member FOREIGN KEY (organization_member_id) REFERENCES `organization_members`(id),
    CONSTRAINT uq_event_staff UNIQUE (event_id, organization_member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT IMAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS `event_images` (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_image FOREIGN KEY (event_id) REFERENCES `events`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS `event_feedback` (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    rating INT,
    comment TEXT,
    is_read BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_event FOREIGN KEY (event_id) REFERENCES `events`(id),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT uq_event_feedback UNIQUE (event_id, user_id),
    CONSTRAINT chk_event_feedback_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- INVITATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS `invitations` (
    id VARCHAR(36) PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    organization_id VARCHAR(36) DEFAULT NULL,
    group_id VARCHAR(36) DEFAULT NULL,
    invited_user_id VARCHAR(36) DEFAULT NULL,
    invited_email VARCHAR(150) DEFAULT NULL,
    invited_by VARCHAR(36) NOT NULL,
    `role` VARCHAR(50) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message TEXT,
    responded_at DATETIME DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitation_org FOREIGN KEY (organization_id) REFERENCES `organizations`(id),
    CONSTRAINT fk_invitation_group FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_invitation_user FOREIGN KEY (invited_user_id) REFERENCES `users`(id),
    CONSTRAINT fk_invitation_sender FOREIGN KEY (invited_by) REFERENCES `users`(id),
    CONSTRAINT ck_invitation_target_type CHECK (target_type IN ('ORGANIZATION', 'GROUP')),
    CONSTRAINT ck_invitation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_invitation_target_ref CHECK (
        (target_type = 'ORGANIZATION' AND organization_id IS NOT NULL AND group_id IS NULL) OR
        (target_type = 'GROUP' AND group_id IS NOT NULL AND organization_id IS NULL)
    ),
    CONSTRAINT ck_invitation_recipient CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) DEFAULT NULL,
    title VARCHAR(150) DEFAULT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    actor_user_id VARCHAR(36) DEFAULT NULL,
    organization_id VARCHAR(36) DEFAULT NULL,
    group_id VARCHAR(36) DEFAULT NULL,
    invitation_id VARCHAR(36) DEFAULT NULL,
    `data` JSON DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES `users`(id),
    CONSTRAINT fk_notification_event FOREIGN KEY (event_id) REFERENCES `events`(id),
    CONSTRAINT fk_notification_actor_user FOREIGN KEY (actor_user_id) REFERENCES `users`(id),
    CONSTRAINT fk_notification_org FOREIGN KEY (organization_id) REFERENCES `organizations`(id),
    CONSTRAINT fk_notification_group FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_notification_invitation FOREIGN KEY (invitation_id) REFERENCES `invitations`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- PASSWORD RESETS
-- =====================================================
CREATE TABLE IF NOT EXISTS `password_resets` (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    reset_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES `users`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- FILES
-- =====================================================
CREATE TABLE IF NOT EXISTS `files` (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) DEFAULT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    type VARCHAR(100) DEFAULT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_uploader FOREIGN KEY (uploaded_by) REFERENCES `users`(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- INVITE LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS `invite_links` (
    id VARCHAR(36) PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    expires_at DATETIME DEFAULT NULL,
    max_uses INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_expired BOOLEAN DEFAULT 0,
    message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invite_link_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_link_creator FOREIGN KEY (created_by) REFERENCES `organizations`(id),
    CONSTRAINT ck_invite_link_max_uses CHECK (max_uses > 0),
    CONSTRAINT ck_invite_link_current_uses CHECK (current_uses >= 0),
    CONSTRAINT ck_invite_link_usage_limit CHECK (current_uses <= max_uses)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS `chat_messages` (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) DEFAULT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    reply_to_id VARCHAR(36) DEFAULT NULL,
    is_edited BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    scope VARCHAR(20) NOT NULL DEFAULT 'group',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_message_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id) REFERENCES `users`(id),
    CONSTRAINT fk_chat_message_reply FOREIGN KEY (reply_to_id) REFERENCES `chat_messages`(id) ON DELETE SET NULL,
    CONSTRAINT ck_chat_message_type CHECK (message_type IN ('text', 'file', 'mixed')),
    CONSTRAINT ck_chat_message_scope CHECK (scope IN ('group', 'global'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- CHAT MESSAGE FILES
-- =====================================================
CREATE TABLE IF NOT EXISTS `chat_message_files` (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    file_type VARCHAR(100) DEFAULT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'group',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_file_message FOREIGN KEY (message_id) REFERENCES `chat_messages`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- CHAT MESSAGE READS
-- =====================================================
CREATE TABLE IF NOT EXISTS `chat_message_reads` (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scope VARCHAR(20) NOT NULL DEFAULT 'group',
    CONSTRAINT fk_chat_read_message FOREIGN KEY (message_id) REFERENCES `chat_messages`(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_read_user FOREIGN KEY (user_id) REFERENCES `users`(id) ON DELETE CASCADE,
    CONSTRAINT uq_chat_read UNIQUE (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- INDEXES
-- =====================================================
-- MySQL has no `CREATE INDEX IF NOT EXISTS` / `DROP INDEX IF EXISTS`
-- (those are MariaDB-only), so indexes are created through this helper
-- which checks information_schema first. It is dropped again below.
DELIMITER $$
DROP PROCEDURE IF EXISTS create_index_if_missing$$
CREATE PROCEDURE create_index_if_missing(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64),
    IN p_columns VARCHAR(1000),
    IN p_unique TINYINT
)
MODIFIES SQL DATA
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO v_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index;

    IF v_exists = 0 THEN
        SET @ddl = CONCAT('CREATE ', IF(p_unique = 1, 'UNIQUE ', ''),
                          'INDEX `', p_index, '` ON `', p_table, '` ', p_columns);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL create_index_if_missing('files', 'idx_files_uploaded_by', '(uploaded_by)', 0);
CALL create_index_if_missing('files', 'idx_files_created_at', '(created_at DESC)', 0);
CALL create_index_if_missing('invitations', 'uq_invitation_pending_org_user', '(organization_id, invited_user_id, status)', 1);
CALL create_index_if_missing('invitations', 'uq_invitation_pending_group_user', '(group_id, invited_user_id, status)', 1);
CALL create_index_if_missing('invitations', 'uq_invitation_pending_org_email', '(organization_id, invited_email, status)', 1);
CALL create_index_if_missing('invitations', 'uq_invitation_pending_group_email', '(group_id, invited_email, status)', 1);
CALL create_index_if_missing('invitations', 'idx_invitations_invited_user_id', '(invited_user_id)', 0);
CALL create_index_if_missing('invitations', 'idx_invitations_invited_email', '(invited_email)', 0);
CALL create_index_if_missing('invitations', 'idx_invitations_invited_by', '(invited_by)', 0);
CALL create_index_if_missing('invitations', 'idx_invitations_status', '(status)', 0);
CALL create_index_if_missing('invitations', 'idx_invitations_created_at', '(created_at DESC)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_token', '(token)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_group_id', '(group_id)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_created_by', '(created_by)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_is_active', '(is_active)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_is_expired', '(is_expired)', 0);
CALL create_index_if_missing('invite_links', 'idx_invite_links_expires_at', '(expires_at)', 0);
CALL create_index_if_missing('users', 'idx_users_account_locked', '(account_locked)', 0);
CALL create_index_if_missing('users', 'idx_users_lockout_until', '(lockout_until)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_group_id', '(group_id)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_sender_id', '(sender_id)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_created_at', '(created_at DESC)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_group_created', '(group_id, created_at DESC)', 0);
CALL create_index_if_missing('chat_message_files', 'idx_chat_message_files_message_id', '(message_id)', 0);
CALL create_index_if_missing('chat_message_reads', 'idx_chat_message_reads_message_id', '(message_id)', 0);
CALL create_index_if_missing('chat_message_reads', 'idx_chat_message_reads_user_id', '(user_id)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_scope', '(scope)', 0);
CALL create_index_if_missing('chat_messages', 'idx_chat_messages_scope_created', '(scope, created_at DESC)', 0);
CALL create_index_if_missing('chat_message_files', 'idx_chat_message_files_scope', '(scope)', 0);
CALL create_index_if_missing('chat_message_reads', 'idx_chat_message_reads_scope', '(scope)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_user_read_created', '(user_id, is_read, created_at DESC)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_type', '(type)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_event_id', '(event_id)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_group_id', '(group_id)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_org_id', '(organization_id)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_invitation_id', '(invitation_id)', 0);
CALL create_index_if_missing('notifications', 'idx_notifications_created_at', '(created_at DESC)', 0);
-- qr_image_path is TEXT, so MySQL requires an explicit key prefix length.
CALL create_index_if_missing('event_registrations', 'idx_event_registrations_qr_image_path', '(qr_image_path(255))', 0);

DROP PROCEDURE IF EXISTS create_index_if_missing;

-- =====================================================
-- VIEWS
-- =====================================================
DROP VIEW IF EXISTS global_chat_messages;
CREATE VIEW global_chat_messages AS
SELECT id, sender_id, content, message_type, reply_to_id, is_edited, is_deleted, created_at, updated_at
FROM `chat_messages`
WHERE scope = 'global' AND is_deleted = 0
ORDER BY created_at DESC;

DROP VIEW IF EXISTS group_chat_messages;
CREATE VIEW group_chat_messages AS
SELECT id, group_id, sender_id, content, message_type, reply_to_id, is_edited, is_deleted, created_at, updated_at
FROM `chat_messages`
WHERE scope = 'group' AND is_deleted = 0
ORDER BY created_at DESC;

-- =====================================================
-- TRIGGERS & STORED ROUTINES
-- =====================================================
DELIMITER $$

-- Triggers: auto-generate UUID() when id is null
DROP TRIGGER IF EXISTS trg_users_set_uuid$$
CREATE TRIGGER trg_users_set_uuid
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_user_profile_set_uuid$$
CREATE TRIGGER trg_user_profile_set_uuid
BEFORE INSERT ON `user_profile`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_organization_applications_set_uuid$$
CREATE TRIGGER trg_organization_applications_set_uuid
BEFORE INSERT ON `organization_applications`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_organizations_set_uuid$$
CREATE TRIGGER trg_organizations_set_uuid
BEFORE INSERT ON `organizations`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_organization_members_set_uuid$$
CREATE TRIGGER trg_organization_members_set_uuid
BEFORE INSERT ON `organization_members`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_groups_set_uuid$$
CREATE TRIGGER trg_groups_set_uuid
BEFORE INSERT ON `groups`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_group_members_set_uuid$$
CREATE TRIGGER trg_group_members_set_uuid
BEFORE INSERT ON `group_members`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_events_set_uuid$$
CREATE TRIGGER trg_events_set_uuid
BEFORE INSERT ON `events`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_event_agenda_set_uuid$$
CREATE TRIGGER trg_event_agenda_set_uuid
BEFORE INSERT ON `event_agenda`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_event_registrations_set_uuid$$
CREATE TRIGGER trg_event_registrations_set_uuid
BEFORE INSERT ON `event_registrations`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_attendance_logs_set_uuid$$
CREATE TRIGGER trg_attendance_logs_set_uuid
BEFORE INSERT ON `attendance_logs`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_event_staff_set_uuid$$
CREATE TRIGGER trg_event_staff_set_uuid
BEFORE INSERT ON `event_staff`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_event_images_set_uuid$$
CREATE TRIGGER trg_event_images_set_uuid
BEFORE INSERT ON `event_images`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_event_feedback_set_uuid$$
CREATE TRIGGER trg_event_feedback_set_uuid
BEFORE INSERT ON `event_feedback`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_notifications_set_uuid$$
CREATE TRIGGER trg_notifications_set_uuid
BEFORE INSERT ON `notifications`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_password_resets_set_uuid$$
CREATE TRIGGER trg_password_resets_set_uuid
BEFORE INSERT ON `password_resets`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_files_set_uuid$$
CREATE TRIGGER trg_files_set_uuid
BEFORE INSERT ON `files`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_invitations_set_uuid$$
CREATE TRIGGER trg_invitations_set_uuid
BEFORE INSERT ON `invitations`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

-- One BEFORE INSERT trigger per table: multiple triggers with the same
-- timing/event are only portable from MySQL 5.7 onwards, so id and token
-- are defaulted in a single trigger.
DROP TRIGGER IF EXISTS trg_invite_links_set_uuid$$
DROP TRIGGER IF EXISTS trg_invite_links_set_token$$
DROP TRIGGER IF EXISTS trg_invite_links_set_defaults$$
CREATE TRIGGER trg_invite_links_set_defaults
BEFORE INSERT ON `invite_links`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
    IF NEW.token IS NULL OR NEW.token = '' THEN
        SET NEW.token = LOWER(SHA2(CONCAT(UUID(), RAND()), 256));
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_chat_messages_set_uuid$$
CREATE TRIGGER trg_chat_messages_set_uuid
BEFORE INSERT ON `chat_messages`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_chat_message_files_set_uuid$$
CREATE TRIGGER trg_chat_message_files_set_uuid
BEFORE INSERT ON `chat_message_files`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_chat_message_reads_set_uuid$$
CREATE TRIGGER trg_chat_message_reads_set_uuid
BEFORE INSERT ON `chat_message_reads`
FOR EACH ROW
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = UUID();
    END IF;
END$$

-- Stored procedures converted from PostgreSQL functions
DROP PROCEDURE IF EXISTS handle_failed_login$$
CREATE PROCEDURE handle_failed_login(IN p_email VARCHAR(150))
MODIFIES SQL DATA
BEGIN
    DECLARE v_id VARCHAR(36) DEFAULT NULL;
    DECLARE v_failed_attempts INT DEFAULT 0;
    DECLARE v_lockout_count INT DEFAULT 0;

    SELECT id, failed_login_attempts, lockout_count
    INTO v_id, v_failed_attempts, v_lockout_count
    FROM `users`
    WHERE email = p_email
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        UPDATE `users`
        SET failed_login_attempts = failed_login_attempts + 1,
            last_failed_login = NOW()
        WHERE email = p_email;

        IF v_failed_attempts + 1 >= 3 THEN
            UPDATE `users`
            SET account_locked = 1,
                lockout_until = DATE_ADD(NOW(), INTERVAL (5 * (v_lockout_count + 1)) MINUTE),
                lockout_count = v_lockout_count + 1
            WHERE email = p_email;
        END IF;
    END IF;
END$$

DROP PROCEDURE IF EXISTS handle_successful_login$$
CREATE PROCEDURE handle_successful_login(IN p_email VARCHAR(150))
MODIFIES SQL DATA
BEGIN
    UPDATE `users`
    SET failed_login_attempts = 0,
        account_locked = 0,
        lockout_count = 0
    WHERE email = p_email;
END$$

-- A stored function that writes cannot be created while binary logging is on
-- (MySQL error 1418), so the lock check is read-only and the expired-lock
-- reset lives in the unlock_expired_accounts() procedure below.
DROP FUNCTION IF EXISTS is_account_locked$$
CREATE FUNCTION is_account_locked(p_email VARCHAR(150)) RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_id VARCHAR(36) DEFAULT NULL;
    DECLARE v_account_locked BOOLEAN DEFAULT 0;
    DECLARE v_lockout_until DATETIME DEFAULT NULL;

    SELECT id, account_locked, lockout_until
    INTO v_id, v_account_locked, v_lockout_until
    FROM `users`
    WHERE email = p_email
    LIMIT 1;

    IF v_id IS NULL OR v_account_locked = 0 THEN
        RETURN 0;
    END IF;

    IF v_lockout_until IS NULL OR v_lockout_until < NOW() THEN
        RETURN 0;
    END IF;

    RETURN 1;
END$$

DROP PROCEDURE IF EXISTS unlock_expired_accounts$$
CREATE PROCEDURE unlock_expired_accounts()
MODIFIES SQL DATA
BEGIN
    UPDATE `users`
    SET account_locked = 0,
        failed_login_attempts = 0
    WHERE account_locked = 1
      AND (lockout_until IS NULL OR lockout_until < NOW());
END$$

DROP FUNCTION IF EXISTS get_lockout_remaining_minutes$$
CREATE FUNCTION get_lockout_remaining_minutes(p_email VARCHAR(150)) RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_remaining_seconds INT DEFAULT NULL;

    SELECT TIMESTAMPDIFF(SECOND, NOW(), lockout_until)
    INTO v_remaining_seconds
    FROM `users`
    WHERE email = p_email AND account_locked = 1
    LIMIT 1;

    IF v_remaining_seconds IS NULL OR v_remaining_seconds < 0 THEN
        RETURN 0;
    END IF;

    RETURN CEILING(v_remaining_seconds / 60);
END$$

DROP PROCEDURE IF EXISTS update_expired_links$$
CREATE PROCEDURE update_expired_links()
MODIFIES SQL DATA
BEGIN
    UPDATE `invite_links`
    SET is_expired = 1,
        is_active = 0,
        updated_at = NOW()
    WHERE is_expired = 0
      AND (
          (expires_at IS NOT NULL AND expires_at < NOW())
          OR (current_uses >= max_uses)
      );
END$$

DELIMITER ;

-- =====================================================
-- SEED DATA
-- The statements below assume the referenced users and
-- organizations already exist. Run them only after the
-- application has created the prerequisite records.
-- =====================================================
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
VALUES
    ('123e4567-e89b-12d3-a456-426614174010', (SELECT id FROM `organizations` WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1), 'IT08b1', 'IT Batch 1 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'),
    ('123e4567-e89b-12d3-a456-426614174011', (SELECT id FROM `organizations` WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1), 'IT08b2', 'IT Batch 2 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'),
    ('123e4567-e89b-12d3-a456-426614174012', (SELECT id FROM `organizations` WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1), 'IT08b3', 'IT Batch 3 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'),
    ('123e4567-e89b-12d3-a456-426614174013', (SELECT id FROM `organizations` WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1), 'IT08b4', 'IT Batch 4 Group', '49325959-5b46-4a67-bf8e-1d872de203f4');

INSERT IGNORE INTO `group_members` (id, group_id, user_id)
SELECT UUID(), '123e4567-e89b-12d3-a456-426614174010', u.id
FROM `users` u
WHERE u.email IN ('chhorm.phearak@gmail.com', 'you.menglong@gmail.com', 'som.rathanak@gmail.com');

INSERT IGNORE INTO `group_members` (id, group_id, user_id)
SELECT UUID(), '123e4567-e89b-12d3-a456-426614174011', u.id
FROM `users` u
WHERE u.email IN ('keng.koda@gmail.com', 'kheng.senghong@gmail.com', 'dorn.sokon@gmail.com', 'yeur.sreypov@gmail.com', 'rin.borey@gmail.com');

INSERT IGNORE INTO `group_members` (id, group_id, user_id)
SELECT UUID(), '123e4567-e89b-12d3-a456-426614174012', u.id
FROM `users` u
WHERE u.email IN ('nim.sreyneth@gmail.com', 'din.chanmalin@gmail.com', 'ros.nalin@gmail.com', 'hang.sinat@gmail.com');

INSERT IGNORE INTO `group_members` (id, group_id, user_id)
SELECT UUID(), '123e4567-e89b-12d3-a456-426614174013', u.id
FROM `users` u
WHERE u.email IN ('dot.sreynoch@gmail.com', 'soeung.reaksa@gmail.com', 'ren.sreypi@gmail.com', 'hai.thida@gmail.com');

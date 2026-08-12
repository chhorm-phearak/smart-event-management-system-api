-- =====================================================
-- ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default roles
INSERT IGNORE INTO roles (role_id, name, description)
VALUES
    ('user_role', 'User', 'Regular user with standard permissions'),
    ('admin_role', 'Administrator', 'System administrator with full access');

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    role_id VARCHAR(50) NOT NULL DEFAULT 'user_role',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- =====================================================
-- USER PROFILE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profile (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    img_url TEXT,
    contact VARCHAR(50),
    email VARCHAR(150),
    gender VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- ORGANIZATION APPLICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_applications (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    org_name VARCHAR(150) NOT NULL,
    org_type VARCHAR(50),
    contact VARCHAR(50),
    email VARCHAR(150),
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    reviewed_by CHAR(36),
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_app_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_org_app_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    org_name VARCHAR(150) NOT NULL,
    org_type VARCHAR(50),
    contact VARCHAR(50),
    email VARCHAR(150),
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_owner
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    organization_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_member_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_org_member_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

-- =====================================================
-- GROUPS (`groups` is a reserved word in MySQL, always quote it)
-- =====================================================
CREATE TABLE IF NOT EXISTS `groups` (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_group_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================
-- GROUP MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    group_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_member_group
        FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_group_member_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

-- =====================================================
-- EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    organization_id CHAR(36) NOT NULL,
    group_id CHAR(36),
    created_by CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    category VARCHAR(50),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INT,
    capacity INT,
    location VARCHAR(200),
    full_address TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT',
    is_public BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_event_group
        FOREIGN KEY (group_id) REFERENCES `groups`(id),
    CONSTRAINT fk_event_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================
-- EVENT AGENDA
-- =====================================================
CREATE TABLE IF NOT EXISTS event_agenda (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    title VARCHAR(150),
    description TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agenda_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =====================================================
-- EVENT REGISTRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS event_registrations (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    qr_code TEXT NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registration_event
        FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_registration_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_event_registration UNIQUE (event_id, user_id)
);

-- =====================================================
-- ATTENDANCE LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    registration_id CHAR(36) NOT NULL,
    scanned_by CHAR(36) NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'CHECKED_IN',
    CONSTRAINT fk_attendance_registration
        FOREIGN KEY (registration_id) REFERENCES event_registrations(id),
    CONSTRAINT fk_attendance_staff
        FOREIGN KEY (scanned_by) REFERENCES users(id),
    CONSTRAINT uq_attendance UNIQUE (registration_id)
);

-- =====================================================
-- EVENT STAFF
-- =====================================================
CREATE TABLE IF NOT EXISTS event_staff (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    organization_member_id CHAR(36) NOT NULL,
    role VARCHAR(50),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_event
        FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_staff_member
        FOREIGN KEY (organization_member_id) REFERENCES organization_members(id),
    CONSTRAINT uq_event_staff UNIQUE (event_id, organization_member_id)
);

-- =====================================================
-- EVENT IMAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS event_images (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_image
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =====================================================
-- EVENT FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS event_feedback (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_event
        FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_event_feedback UNIQUE (event_id, user_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36),
    title VARCHAR(150),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_notification_event
        FOREIGN KEY (event_id) REFERENCES events(id)
);

-- =====================================================
-- PASSWORD RESETS
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    reset_token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------

-- Create roles table with role_id as primary key (string)
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with foreign key reference to roles.role_id
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id VARCHAR(50) NOT NULL DEFAULT 'user_role',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone VARCHAR(20),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles (role_id)
        ON DELETE RESTRICT
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS organization_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_app_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_owner
        FOREIGN KEY (user_id)
        REFERENCES users (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_group_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_group_member_group
        FOREIGN KEY (group_id)
        REFERENCES groups (id),

    CONSTRAINT fk_group_member_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    group_id UUID,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_event_group
        FOREIGN KEY (group_id)
        REFERENCES groups (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS event_agenda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,

    CONSTRAINT fk_agenda_event
        FOREIGN KEY (event_id)
        REFERENCES events (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    qr_code TEXT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_registration_event
        FOREIGN KEY (event_id)
        REFERENCES events (id),

    CONSTRAINT fk_event_registration_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT uq_event_registration UNIQUE (event_id, user_id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS event_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_staff_event
        FOREIGN KEY (event_id)
        REFERENCES events (id),

    CONSTRAINT fk_event_staff_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT uq_event_staff UNIQUE (event_id, user_id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL,
    scanned_by UUID NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'PRESENT',

    CONSTRAINT fk_attendance_registration
        FOREIGN KEY (registration_id)
        REFERENCES event_registrations (id),

    CONSTRAINT fk_attendance_scanner
        FOREIGN KEY (scanned_by)
        REFERENCES users (id)
);

---------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_id UUID,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT fk_notification_event
        FOREIGN KEY (event_id)
        REFERENCES events (id)
);

-- insert role
INSERT INTO roles (role_id, name, description) VALUES
('user_role', 'User', 'Regular user with standard permissions'),
('admin_role', 'Administrator', 'System administrator with full access');

-- =====================================================
-- CREATE GROUPS AND ADD USERS SCRIPT
-- Based on the image data provided
-- =====================================================

-- First, let's assume we have an existing organization and user to create the groups
-- You may need to adjust these UUIDs based on your actual data

-- Set variables for organization and creator (replace with actual UUIDs from your database)
-- For this script, we'll create a temporary organization if needed

-- Create a default organization if it doesn't exist
INSERT IGNORE INTO organizations (id, user_id, org_name, org_type, contact, email, description, status)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174001',
    'IT Department',
    'EDUCATIONAL',
    '012345678',
    'it.department@example.com',
    'Information Technology Department Groups',
    'ACTIVE'
);

-- =====================================================
-- CREATE GROUPS
-- =====================================================

-- Group IT08b1
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
VALUES (
    '123e4567-e89b-12d3-a456-426614174010',
    '123e4567-e89b-12d3-a456-426614174000',
    'IT08b1',
    'IT Batch 1 Group',
    '123e4567-e89b-12d3-a456-426614174001'
);

-- Group IT08b2
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
VALUES (
    '123e4567-e89b-12d3-a456-426614174011',
    '123e4567-e89b-12d3-a456-426614174000',
    'IT08b2',
    'IT Batch 2 Group',
    '123e4567-e89b-12d3-a456-426614174001'
);

-- Group IT08b3
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
VALUES (
    '123e4567-e89b-12d3-a456-426614174012',
    '123e4567-e89b-12d3-a456-426614174000',
    'IT08b3',
    'IT Batch 3 Group',
    '123e4567-e89b-12d3-a456-426614174001'
);

-- Group IT08b4
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
VALUES (
    '123e4567-e89b-12d3-a456-426614174013',
    '123e4567-e89b-12d3-a456-426614174000',
    'IT08b4',
    'IT Batch 4 Group',
    '123e4567-e89b-12d3-a456-426614174001'
);

-- =====================================================
-- CREATE USERS (if they don't exist)
-- Note: Password should be hashed in real application
-- For demo purposes, using plain text "Pw d123@2026"
-- =====================================================

-- IT08b1 Users
INSERT IGNORE INTO users (id, first_name, last_name, email, password, role_id)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174020', 'Chhorm', 'Phearak', 'chhorm.phearak@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174021', 'You', 'Menglong', 'you.menglong@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174022', 'Som', 'Rathanak', 'som.rathanak@gmail.com', 'Pw d123@2026', 'user_role');

-- Create user profiles for IT08b1
INSERT IGNORE INTO user_profile (id, user_id, first_name, last_name, contact, email)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174020', '123e4567-e89b-12d3-a456-426614174020', 'Chhorm', 'Phearak', '012348034', 'chhorm.phearak@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174021', '123e4567-e89b-12d3-a456-426614174021', 'You', 'Menglong', '087675244', 'you.menglong@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174022', '123e4567-e89b-12d3-a456-426614174022', 'Som', 'Rathanak', '0969179556', 'som.rathanak@gmail.com');

-- IT08b2 Users
INSERT IGNORE INTO users (id, first_name, last_name, email, password, role_id)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174030', 'KENG', 'KODA', 'keng.koda@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174031', 'Kheng', 'Senghong', 'kheng.senghong@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174032', 'Dorn', 'Sokon', 'dorn.sokon@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174033', 'Yeur', 'Sreypov', 'yeur.sreypov@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174034', 'Rin', 'Borey', 'rin.borey@gmail.com', 'Pw d123@2026', 'user_role');

-- Create user profiles for IT08b2
INSERT IGNORE INTO user_profile (id, user_id, first_name, last_name, contact, email)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174030', '123e4567-e89b-12d3-a456-426614174030', 'KENG', 'KODA', '963720473', 'keng.koda@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174031', '123e4567-e89b-12d3-a456-426614174031', 'Kheng', 'Senghong', '0882826681', 'kheng.senghong@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174032', '123e4567-e89b-12d3-a456-426614174032', 'Dorn', 'Sokon', '0969367720', 'dorn.sokon@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174033', '123e4567-e89b-12d3-a456-426614174033', 'Yeur', 'Sreypov', '0978263676', 'yeur.sreypov@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174034', '123e4567-e89b-12d3-a456-426614174034', 'Rin', 'Borey', '967032945', 'rin.borey@gmail.com');

-- IT08b3 Users
INSERT IGNORE INTO users (id, first_name, last_name, email, password, role_id)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174040', 'Nim', 'sreyneth', 'nim.sreyneth@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174041', 'Din', 'chanmalin', 'din.chanmalin@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174042', 'Ros', 'Nalin', 'ros.nalin@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174043', 'Hang', 'sinat', 'hang.sinat@gmail.com', 'Pw d123@2026', 'user_role');

-- Create user profiles for IT08b3
INSERT IGNORE INTO user_profile (id, user_id, first_name, last_name, contact, email)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174040', '123e4567-e89b-12d3-a456-426614174040', 'Nim', 'sreyneth', '099496360', 'nim.sreyneth@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174041', '123e4567-e89b-12d3-a456-426614174041', 'Din', 'chanmalin', '716121360', 'din.chanmalin@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174042', '123e4567-e89b-12d3-a456-426614174042', 'Ros', 'Nalin', '716948662', 'ros.nalin@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174043', '123e4567-e89b-12d3-a456-426614174043', 'Hang', 'sinat', '0314367527', 'hang.sinat@gmail.com');

-- IT08b4 Users
INSERT IGNORE INTO users (id, first_name, last_name, email, password, role_id)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174050', 'Dot', 'Sreynoch', 'dot.sreynoch@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174051', 'Soeung', 'Reaksa', 'soeung.reaksa@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174052', 'Ren', 'SreyPi', 'ren.sreypi@gmail.com', 'Pw d123@2026', 'user_role'),
    ('123e4567-e89b-12d3-a456-426614174053', 'Hai', 'Thida', 'hai.thida@gmail.com', 'Pw d123@2026', 'user_role');

-- Create user profiles for IT08b4
INSERT IGNORE INTO user_profile (id, user_id, first_name, last_name, contact, email)
VALUES 
    ('223e4567-e89b-12d3-a456-426614174050', '123e4567-e89b-12d3-a456-426614174050', 'Dot', 'Sreynoch', '0963223248', 'dot.sreynoch@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174051', '123e4567-e89b-12d3-a456-426614174051', 'Soeung', 'Reaksa', '0965811800', 'soeung.reaksa@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174052', '123e4567-e89b-12d3-a456-426614174052', 'Ren', 'SreyPi', '087870175', 'ren.sreypi@gmail.com'),
    ('223e4567-e89b-12d3-a456-426614174053', '123e4567-e89b-12d3-a456-426614174053', 'Hai', 'Thida', '086308566', 'hai.thida@gmail.com');

-- =====================================================
-- ADD USERS TO THEIR RESPECTIVE GROUPS
-- =====================================================

-- Add IT08b1 users to IT08b1 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
VALUES 
    ('323e4567-e89b-12d3-a456-426614174020', '123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174020'),
    ('323e4567-e89b-12d3-a456-426614174021', '123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174021'),
    ('323e4567-e89b-12d3-a456-426614174022', '123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174022');

-- Add IT08b2 users to IT08b2 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
VALUES 
    ('323e4567-e89b-12d3-a456-426614174030', '123e4567-e89b-12d3-a456-426614174011', '123e4567-e89b-12d3-a456-426614174030'),
    ('323e4567-e89b-12d3-a456-426614174031', '123e4567-e89b-12d3-a456-426614174011', '123e4567-e89b-12d3-a456-426614174031'),
    ('323e4567-e89b-12d3-a456-426614174032', '123e4567-e89b-12d3-a456-426614174011', '123e4567-e89b-12d3-a456-426614174032'),
    ('323e4567-e89b-12d3-a456-426614174033', '123e4567-e89b-12d3-a456-426614174011', '123e4567-e89b-12d3-a456-426614174033'),
    ('323e4567-e89b-12d3-a456-426614174034', '123e4567-e89b-12d3-a456-426614174011', '123e4567-e89b-12d3-a456-426614174034');

-- Add IT08b3 users to IT08b3 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
VALUES 
    ('323e4567-e89b-12d3-a456-426614174040', '123e4567-e89b-12d3-a456-426614174012', '123e4567-e89b-12d3-a456-426614174040'),
    ('323e4567-e89b-12d3-a456-426614174041', '123e4567-e89b-12d3-a456-426614174012', '123e4567-e89b-12d3-a456-426614174041'),
    ('323e4567-e89b-12d3-a456-426614174042', '123e4567-e89b-12d3-a456-426614174012', '123e4567-e89b-12d3-a456-426614174042'),
    ('323e4567-e89b-12d3-a456-426614174043', '123e4567-e89b-12d3-a456-426614174012', '123e4567-e89b-12d3-a456-426614174043');

-- Add IT08b4 users to IT08b4 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
VALUES 
    ('323e4567-e89b-12d3-a456-426614174050', '123e4567-e89b-12d3-a456-426614174013', '123e4567-e89b-12d3-a456-426614174050'),
    ('323e4567-e89b-12d3-a456-426614174051', '123e4567-e89b-12d3-a456-426614174013', '123e4567-e89b-12d3-a456-426614174051'),
    ('323e4567-e89b-12d3-a456-426614174052', '123e4567-e89b-12d3-a456-426614174013', '123e4567-e89b-12d3-a456-426614174052'),
    ('323e4567-e89b-12d3-a456-426614174053', '123e4567-e89b-12d3-a456-426614174013', '123e4567-e89b-12d3-a456-426614174053');

-- =====================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- View all created groups
-- SELECT g.*, o.org_name FROM `groups` g 
-- LEFT JOIN organizations o ON g.organization_id = o.id 
-- WHERE g.name LIKE 'IT08b%';

-- View all users in each group
-- SELECT g.name as group_name, u.first_name, u.last_name, u.email, up.contact
-- FROM `groups` g
-- LEFT JOIN group_members gm ON g.id = gm.group_id
-- LEFT JOIN users u ON gm.user_id = u.id
-- LEFT JOIN user_profile up ON u.id = up.user_id
-- WHERE g.name LIKE 'IT08b%'
-- ORDER BY g.name, u.first_name;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script creates:
-- 1. 4 groups: IT08b1, IT08b2, IT08b3, IT08b4
-- 2. 16 users with their profiles and contact information
-- 3. Adds each user to their respective group
-- 4. Uses UUID primary keys as per your database schema
-- 5. Uses INSERT IGNORE to prevent duplicate insertions
-- =====================================================

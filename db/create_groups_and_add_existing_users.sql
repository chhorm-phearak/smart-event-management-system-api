-- =====================================================
-- CREATE GROUPS AND ADD EXISTING USERS BY EMAIL
-- Gets users from users table by Gmail and adds them to groups
-- =====================================================

-- Create the 4 groups using the specified organizer ID
INSERT IGNORE INTO `groups` (id, organization_id, name, description, created_by)
SELECT * FROM (
    SELECT
        '123e4567-e89b-12d3-a456-426614174010' AS id,
        (SELECT id FROM organizations WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1) AS organization_id,
        'IT08b1' AS name,
        'IT Batch 1 Group' AS description,
        '49325959-5b46-4a67-bf8e-1d872de203f4' AS created_by
    UNION ALL SELECT
        '123e4567-e89b-12d3-a456-426614174011',
        (SELECT id FROM organizations WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1),
        'IT08b2', 'IT Batch 2 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'
    UNION ALL SELECT
        '123e4567-e89b-12d3-a456-426614174012',
        (SELECT id FROM organizations WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1),
        'IT08b3', 'IT Batch 3 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'
    UNION ALL SELECT
        '123e4567-e89b-12d3-a456-426614174013',
        (SELECT id FROM organizations WHERE user_id = '49325959-5b46-4a67-bf8e-1d872de203f4' LIMIT 1),
        'IT08b4', 'IT Batch 4 Group', '49325959-5b46-4a67-bf8e-1d872de203f4'
) AS new_groups;

-- Add IT08b1 users to IT08b1 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
SELECT 
    UUID() as id,
    '123e4567-e89b-12d3-a456-426614174010' as group_id,
    u.id as user_id
FROM users u
WHERE u.email IN ('chhorm.phearak@gmail.com', 'you.menglong@gmail.com', 'som.rathanak@gmail.com');

-- Add IT08b2 users to IT08b2 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
SELECT 
    UUID() as id,
    '123e4567-e89b-12d3-a456-426614174011' as group_id,
    u.id as user_id
FROM users u
WHERE u.email IN ('keng.koda@gmail.com', 'kheng.senghong@gmail.com', 'dorn.sokon@gmail.com', 'yeur.sreypov@gmail.com', 'rin.borey@gmail.com');

-- Add IT08b3 users to IT08b3 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
SELECT 
    UUID() as id,
    '123e4567-e89b-12d3-a456-426614174012' as group_id,
    u.id as user_id
FROM users u
WHERE u.email IN ('nim.sreyneth@gmail.com', 'din.chanmalin@gmail.com', 'ros.nalin@gmail.com', 'hang.sinat@gmail.com');

-- Add IT08b4 users to IT08b4 group
INSERT IGNORE INTO group_members (id, group_id, user_id)
SELECT 
    UUID() as id,
    '123e4567-e89b-12d3-a456-426614174013' as group_id,
    u.id as user_id
FROM users u
WHERE u.email IN ('dot.sreynoch@gmail.com', 'soeung.reaksa@gmail.com', 'ren.sreypi@gmail.com', 'hai.thida@gmail.com');

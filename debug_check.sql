-- Debug: Check which groups belong to user's organization
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.organization_id,
    o.org_name as organization_name
FROM groups g
JOIN organizations o ON g.organization_id = o.id
WHERE o.id = 'f56160d7-8274-4ba3-ae17-fddcca246a8a'; -- Your organization_id from login response

-- Check ownership of the specific group you're trying to access
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.organization_id,
    o.org_name as organization_name,
    CASE WHEN o.id = g.organization_id THEN 'OWNED' ELSE 'NOT_OWNED' END as ownership_status
FROM groups g
JOIN organizations o ON g.organization_id = o.id
WHERE g.id = '5605b5b0-cc74-46e2-a881-5a95b44d1a3b'; -- Group you're trying to access

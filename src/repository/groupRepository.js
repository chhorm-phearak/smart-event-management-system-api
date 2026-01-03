const db = require('../config/db');

const createGroup = async ({ organization_id, name, description }) => {
  const result = await db.query(
    `INSERT INTO groups (organization_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [organization_id, name, description || null]
  );
  return result.rows[0];
};

const findGroupById = async (groupId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name, o.user_id as org_owner_id
     FROM groups g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.id = $1`,
    [groupId]
  );
  return result.rows[0];
};

const getAllGroupsByOrganization = async (organizationId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name,
     (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM groups g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.organization_id = $1
     ORDER BY g.created_at DESC`,
    [organizationId]
  );
  return result.rows;
};

const updateGroup = async (groupId, { name, description }) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }

  if (updates.length === 0) {
    return await findGroupById(groupId);
  }

  values.push(groupId);
  const query = `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const deleteGroup = async (groupId) => {
  // First delete group members
  await db.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);
  
  // Delete events associated with this group (or set group_id to null)
  // For safety, we'll delete events that belong only to this group
  await db.query('DELETE FROM events WHERE group_id = $1', [groupId]);
  
  // Then delete the group
  const result = await db.query('DELETE FROM groups WHERE id = $1 RETURNING *', [groupId]);
  return result.rows[0];
};

const addGroupMember = async (groupId, userId) => {
  const result = await db.query(
    `INSERT INTO group_members (group_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING
     RETURNING *`,
    [groupId, userId]
  );
  return result.rows[0];
};

const removeGroupMember = async (groupId, userId) => {
  const result = await db.query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *',
    [groupId, userId]
  );
  return result.rows[0];
};

const getGroupMembers = async (groupId) => {
  const result = await db.query(
    `SELECT gm.*, 
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.email,
            up.contact
     FROM group_members gm
     LEFT JOIN users u ON gm.user_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE gm.group_id = $1 AND u.is_deleted = FALSE
     ORDER BY gm.joined_at DESC`,
    [groupId]
  );
  return result.rows;
};

const isGroupMember = async (groupId, userId) => {
  const result = await db.query(
    'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return result.rows.length > 0;
};

const getUserGroups = async (userId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name, o.user_id as org_owner_id
     FROM groups g
     LEFT JOIN organizations o ON g.organization_id = o.id
     LEFT JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = $1 OR o.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  createGroup,
  findGroupById,
  getAllGroupsByOrganization,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getGroupMembers,
  isGroupMember,
  getUserGroups,
};


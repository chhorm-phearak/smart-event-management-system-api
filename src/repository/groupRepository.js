const db = require('../config/db');

const createGroup = async ({ organization_id, created_by, name, description, image_url }) => {
  const result = await db.query(
    `INSERT INTO \`groups\` (organization_id, created_by, name, description, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [organization_id, created_by, name, description || null, image_url || null]
  );
  return result.rows[0];
};

const findGroupById = async (groupId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name, o.user_id as org_owner_id
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.id = $1 AND g.is_deleted = FALSE`,
    [groupId]
  );
  return result.rows[0];
};

const getAllGroupsByOrganization = async (organizationId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name,
     (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.organization_id = $1 AND g.is_deleted = FALSE
     ORDER BY g.created_at DESC`,
    [organizationId]
  );
  return result.rows;
};

const updateGroup = async (groupId, { name, description, image_url }) => {
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
  if (image_url !== undefined) {
    updates.push(`image_url = $${paramCount++}`);
    values.push(image_url);
  }

  if (updates.length === 0) {
    return await findGroupById(groupId);
  }

  values.push(groupId);
  const query = `UPDATE \`groups\` SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const deleteGroup = async (groupId) => {
  await db.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);

  // Delete events that belong to this group (and their dependent rows)
  const eventsResult = await db.query('SELECT id FROM events WHERE group_id = $1', [groupId]);
  for (const row of eventsResult.rows) {
    const eventId = row.id;
    await db.query(
      `DELETE FROM attendance_logs
       WHERE registration_id IN (SELECT id FROM event_registrations WHERE event_id = $1)`,
      [eventId]
    );
    await db.query('DELETE FROM event_agenda WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM event_staff WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM event_feedback WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM notifications WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM event_images WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM event_registrations WHERE event_id = $1', [eventId]);
    await db.query('DELETE FROM events WHERE id = $1', [eventId]);
  }

  const result = await db.query('DELETE FROM `groups` WHERE id = $1 RETURNING *', [groupId]);
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
            up.contact,
            up.img_url
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
    `SELECT DISTINCT g.*, o.org_name as organization_name, o.user_id as org_owner_id,
     (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
     (SELECT COUNT(*) FROM events WHERE group_id = g.id) as event_count
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     LEFT JOIN group_members gm ON g.id = gm.group_id
     WHERE (gm.user_id = $1 OR o.user_id = $1) AND g.is_deleted = FALSE
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


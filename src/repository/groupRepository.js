const db = require('../config/db');
const { newId } = require('../utils/uuid');

const createGroup = async ({ organization_id, created_by, name, description, image_url }) => {
  const groupId = newId();
  await db.query(
    'INSERT INTO `groups` (id, organization_id, created_by, name, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [groupId, organization_id, created_by, name, description || null, image_url || null]
  );
  return await findGroupById(groupId);
};

const findGroupById = async (groupId) => {
  const result = await db.query(
    `SELECT g.*, o.org_name as organization_name, o.user_id as org_owner_id
     FROM \`groups\` g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.id = ? AND g.is_deleted = FALSE`,
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
     WHERE g.organization_id = ? AND g.is_deleted = FALSE
     ORDER BY g.created_at DESC`,
    [organizationId]
  );
  return result.rows;
};

const updateGroup = async (groupId, { name, description, image_url }) => {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(image_url);
  }

  if (updates.length === 0) {
    return await findGroupById(groupId);
  }

  values.push(groupId);
  await db.query('UPDATE `groups` SET ' + updates.join(', ') + ' WHERE id = ?', values);
  return await findGroupById(groupId);
};

const deleteGroup = async (groupId) => {
  await db.query('DELETE FROM group_members WHERE group_id = ?', [groupId]);

  // Delete events that belong to this group (and their dependent rows)
  const eventsResult = await db.query('SELECT id FROM events WHERE group_id = ?', [groupId]);
  for (const row of eventsResult.rows) {
    const eventId = row.id;
    await db.query(
      `DELETE FROM attendance_logs
       WHERE registration_id IN (SELECT id FROM (SELECT id FROM event_registrations WHERE event_id = ?) AS regs)`,
      [eventId]
    );
    await db.query('DELETE FROM event_agenda WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM event_staff WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM event_feedback WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM notifications WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM event_images WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM event_registrations WHERE event_id = ?', [eventId]);
    await db.query('DELETE FROM events WHERE id = ?', [eventId]);
  }

  const existing = await findGroupById(groupId);
  await db.query('DELETE FROM `groups` WHERE id = ?', [groupId]);
  return existing;
};

const addGroupMember = async (groupId, userId) => {
  await db.query(
    `INSERT IGNORE INTO group_members (id, group_id, user_id)
     VALUES (?, ?, ?)`,
    [newId(), groupId, userId]
  );
  const result = await db.query(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return result.rows[0];
};

const removeGroupMember = async (groupId, userId) => {
  const existing = await db.query(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  await db.query(
    'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return existing.rows[0];
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
     WHERE gm.group_id = ? AND u.is_deleted = FALSE
     ORDER BY gm.joined_at DESC`,
    [groupId]
  );
  return result.rows;
};

const isGroupMember = async (groupId, userId) => {
  const result = await db.query(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
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
     WHERE (gm.user_id = ? OR o.user_id = ?) AND g.is_deleted = FALSE
     ORDER BY g.created_at DESC`,
    [userId, userId]
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


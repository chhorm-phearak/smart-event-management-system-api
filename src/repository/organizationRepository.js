const db = require('../config/db');
const { newId } = require('../utils/uuid');

const findOrganizationById = async (organizationId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE id = ?',
    [organizationId]
  );
  return result.rows[0];
};

const findOrganizationByUserId = async (userId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE user_id = ?',
    [userId]
  );
  return result.rows;
};

const isOrganizationOwner = async (organizationId, userId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE id = ? AND user_id = ?',
    [organizationId, userId]
  );
  return result.rows.length > 0;
};

const createOrganization = async ({
  user_id,
  org_name,
  org_type,
  contact,
  email,
  description,
  status,
}) => {
  const organizationId = newId();
  await db.query(
    `INSERT INTO organizations (id, user_id, org_name, org_type, contact, email, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId,
      user_id,
      org_name,
      org_type || null,
      contact || null,
      email || null,
      description || null,
      status || 'ACTIVE',
    ]
  );
  return await findOrganizationById(organizationId);
};

const updateOrganization = async (organizationId, { org_name, org_type, contact, email, description, status }) => {
  const updates = [];
  const values = [];
  if (org_name !== undefined) {
    updates.push('org_name = ?');
    values.push(org_name);
  }
  if (org_type !== undefined) {
    updates.push('org_type = ?');
    values.push(org_type);
  }
  if (contact !== undefined) {
    updates.push('contact = ?');
    values.push(contact);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }
  if (updates.length === 0) {
    return await findOrganizationById(organizationId);
  }
  values.push(organizationId);
  await db.query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  return await findOrganizationById(organizationId);
};

const deleteOrganization = async (organizationId) => {
  const existing = await findOrganizationById(organizationId);
  await db.query('DELETE FROM organizations WHERE id = ?', [organizationId]);
  return existing;
};

// ----- Organization members -----
const getOrganizationMembers = async (organizationId) => {
  const result = await db.query(
    `SELECT om.*,
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.email,
            up.contact as profile_contact,
            up.img_url
     FROM organization_members om
     LEFT JOIN users u ON om.user_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE om.organization_id = ? AND (u.is_deleted = FALSE OR u.is_deleted IS NULL)
     ORDER BY om.joined_at DESC`,
    [organizationId]
  );
  return result.rows;
};

const findOrganizationMemberById = async (memberId) => {
  const result = await db.query(
    `SELECT om.*, o.user_id as org_owner_id
     FROM organization_members om
     LEFT JOIN organizations o ON om.organization_id = o.id
     WHERE om.id = ?`,
    [memberId]
  );
  return result.rows[0];
};

const addOrganizationMember = async (organizationId, userId) => {
  await db.query(
    `INSERT IGNORE INTO organization_members (id, organization_id, user_id)
     VALUES (?, ?, ?)`,
    [newId(), organizationId, userId]
  );
  const result = await db.query(
    'SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?',
    [organizationId, userId]
  );
  return result.rows[0];
};

const deleteOrganizationMember = async (memberId) => {
  const existing = await findOrganizationMemberById(memberId);
  await db.query('DELETE FROM organization_members WHERE id = ?', [memberId]);
  return existing;
};

module.exports = {
  findOrganizationById,
  findOrganizationByUserId,
  isOrganizationOwner,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  findOrganizationMemberById,
  addOrganizationMember,
  deleteOrganizationMember,
};


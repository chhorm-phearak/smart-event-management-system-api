const db = require('../config/db');

const findOrganizationById = async (organizationId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE id = $1',
    [organizationId]
  );
  return result.rows[0];
};

const findOrganizationByUserId = async (userId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE user_id = $1',
    [userId]
  );
  return result.rows;
};

const isOrganizationOwner = async (organizationId, userId) => {
  const result = await db.query(
    'SELECT * FROM organizations WHERE id = $1 AND user_id = $2',
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
  const result = await db.query(
    `INSERT INTO organizations (user_id, org_name, org_type, contact, email, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user_id,
      org_name,
      org_type || null,
      contact || null,
      email || null,
      description || null,
      status || 'ACTIVE',
    ]
  );
  return result.rows[0];
};

const updateOrganization = async (organizationId, { org_name, org_type, contact, email, description, status }) => {
  const updates = [];
  const values = [];
  let paramCount = 1;
  if (org_name !== undefined) {
    updates.push(`org_name = $${paramCount++}`);
    values.push(org_name);
  }
  if (org_type !== undefined) {
    updates.push(`org_type = $${paramCount++}`);
    values.push(org_type);
  }
  if (contact !== undefined) {
    updates.push(`contact = $${paramCount++}`);
    values.push(contact);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(email);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }
  if (updates.length === 0) {
    return await findOrganizationById(organizationId);
  }
  values.push(organizationId);
  const result = await db.query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteOrganization = async (organizationId) => {
  const result = await db.query('DELETE FROM organizations WHERE id = $1 RETURNING *', [organizationId]);
  return result.rows[0];
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
     WHERE om.organization_id = $1 AND (u.is_deleted = FALSE OR u.is_deleted IS NULL)
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
     WHERE om.id = $1`,
    [memberId]
  );
  return result.rows[0];
};

const addOrganizationMember = async (organizationId, userId) => {
  const result = await db.query(
    `INSERT INTO organization_members (organization_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (organization_id, user_id) DO NOTHING
     RETURNING *`,
    [organizationId, userId]
  );
  return result.rows[0];
};

const deleteOrganizationMember = async (memberId) => {
  const result = await db.query(
    'DELETE FROM organization_members WHERE id = $1 RETURNING *',
    [memberId]
  );
  return result.rows[0];
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


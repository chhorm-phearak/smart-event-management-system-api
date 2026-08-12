const db = require('../config/db');
const { deleteGroup } = require('./groupRepository');

const getOrganizationAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*) AS total_organizers,
      COALESCE(SUM(o.status = 'ACTIVE'), 0) AS total_active,
      COALESCE(SUM(o.status = 'INACTIVE'), 0) AS total_inactive,
      COALESCE(SUM(o.status = 'SUSPENDED'), 0) AS total_suspended
    FROM organizations o
  `);
  const row = result.rows[0];
  return {
    total_organizers: parseInt(row.total_organizers, 10),
    total_active: parseInt(row.total_active, 10),
    total_inactive: parseInt(row.total_inactive, 10),
    total_suspended: parseInt(row.total_suspended, 10),
  };
};

const getAllOrganizations = async ({ search, status, org_type, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    conditions.push('(o.org_name LIKE ? OR o.email LIKE ?)');
  }

  if (status) {
    values.push(status);
    conditions.push('o.status = ?');
  }

  if (org_type) {
    values.push(org_type);
    conditions.push('o.org_type = ?');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM organizations o ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get organizations with pagination
  values.push(Number(limit));
  values.push(Number(offset));

  const result = await db.query(
    `SELECT 
      o.id,
      o.user_id,
      o.org_name,
      o.org_type,
      o.contact,
      o.email,
      o.description,
      o.status,
      o.created_at,
      u.first_name as owner_first_name,
      u.last_name as owner_last_name,
      u.email as owner_email
    FROM organizations o
    LEFT JOIN users u ON o.user_id = u.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?`,
    values
  );

  return {
    organizations: result.rows,
    total,
    limit,
    offset,
  };
};

const getOrganizationById = async (organizationId) => {
  const result = await db.query(
    `SELECT 
      o.id,
      o.user_id,
      o.org_name,
      o.org_type,
      o.contact,
      o.email,
      o.description,
      o.status,
      o.created_at,
      u.first_name as owner_first_name,
      u.last_name as owner_last_name,
      u.email as owner_email
    FROM organizations o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?`,
    [organizationId]
  );
  return result.rows[0];
};

const updateOrganizationStatus = async (organizationId, status) => {
  await db.query(
    `UPDATE organizations SET status = ? WHERE id = ?`,
    [status, organizationId]
  );
  const result = await db.query('SELECT * FROM organizations WHERE id = ?', [organizationId]);
  return result.rows[0];
};

const deleteOrganization = async (organizationId) => {
  const existing = await db.query('SELECT * FROM organizations WHERE id = ?', [organizationId]);

  const groupsResult = await db.query('SELECT id FROM `groups` WHERE organization_id = ?', [organizationId]);
  for (const group of groupsResult.rows) {
    await deleteGroup(group.id);
  }

  const eventsResult = await db.query('SELECT id FROM events WHERE organization_id = ?', [organizationId]);
  for (const event of eventsResult.rows) {
    await db.query(
      `DELETE FROM attendance_logs
       WHERE registration_id IN (SELECT id FROM (SELECT id FROM event_registrations WHERE event_id = ?) AS regs)`,
      [event.id]
    );
    await db.query('DELETE FROM event_agenda WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM event_staff WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM event_feedback WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM notifications WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM event_images WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM event_registrations WHERE event_id = ?', [event.id]);
    await db.query('DELETE FROM events WHERE id = ?', [event.id]);
  }

  await db.query(
    `DELETE FROM notifications
     WHERE invitation_id IN (SELECT id FROM (SELECT id FROM invitations WHERE organization_id = ?) AS invs)`,
    [organizationId]
  );
  await db.query('DELETE FROM notifications WHERE organization_id = ?', [organizationId]);
  await db.query('DELETE FROM invitations WHERE organization_id = ?', [organizationId]);
  await db.query('DELETE FROM organization_members WHERE organization_id = ?', [organizationId]);

  await db.query(`DELETE FROM organizations WHERE id = ?`, [organizationId]);
  return existing.rows[0];
};

module.exports = {
  getOrganizationAdminStats,
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  deleteOrganization,
};

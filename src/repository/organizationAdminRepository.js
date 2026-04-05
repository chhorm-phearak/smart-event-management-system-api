const db = require('../config/db');

const getAllOrganizations = async ({ search, status, org_type, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(o.org_name ILIKE $${values.length} OR o.email ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`o.status = $${values.length}`);
  }

  if (org_type) {
    values.push(org_type);
    conditions.push(`o.org_type = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM organizations o ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get organizations with pagination
  values.push(limit);
  values.push(offset);

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
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
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
    WHERE o.id = $1`,
    [organizationId]
  );
  return result.rows[0];
};

const updateOrganizationStatus = async (organizationId, status) => {
  const result = await db.query(
    `UPDATE organizations SET status = $1 WHERE id = $2 RETURNING *`,
    [status, organizationId]
  );
  return result.rows[0];
};

const deleteOrganization = async (organizationId) => {
  const result = await db.query(
    `DELETE FROM organizations WHERE id = $1 RETURNING *`,
    [organizationId]
  );
  return result.rows[0];
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  deleteOrganization,
};

const db = require('../config/db');

const getAllApplications = async ({ search, status, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(oa.org_name ILIKE $${values.length} OR oa.email ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`oa.status = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM organization_applications oa ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get applications with pagination
  values.push(limit);
  values.push(offset);

  const result = await db.query(
    `SELECT 
      oa.id,
      oa.user_id,
      oa.org_name,
      oa.org_type,
      oa.contact,
      oa.email,
      oa.description,
      oa.status,
      oa.reviewed_by,
      oa.reviewed_at,
      oa.created_at,
      u.first_name as applicant_first_name,
      u.last_name as applicant_last_name,
      u.email as applicant_email,
      r.first_name as reviewer_first_name,
      r.last_name as reviewer_last_name
    FROM organization_applications oa
    LEFT JOIN users u ON oa.user_id = u.id
    LEFT JOIN users r ON oa.reviewed_by = r.id
    ${whereClause}
    ORDER BY oa.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return {
    applications: result.rows,
    total,
    limit,
    offset,
  };
};

const getApplicationById = async (applicationId) => {
  const result = await db.query(
    `SELECT 
      oa.id,
      oa.user_id,
      oa.org_name,
      oa.org_type,
      oa.contact,
      oa.email,
      oa.description,
      oa.status,
      oa.reviewed_by,
      oa.reviewed_at,
      oa.created_at,
      u.first_name as applicant_first_name,
      u.last_name as applicant_last_name,
      u.email as applicant_email,
      r.first_name as reviewer_first_name,
      r.last_name as reviewer_last_name
    FROM organization_applications oa
    LEFT JOIN users u ON oa.user_id = u.id
    LEFT JOIN users r ON oa.reviewed_by = r.id
    WHERE oa.id = $1`,
    [applicationId]
  );
  return result.rows[0];
};

const updateApplicationStatus = async (applicationId, status, reviewedBy) => {
  const result = await db.query(
    `UPDATE organization_applications 
     SET status = $1, reviewed_by = $2, reviewed_at = NOW() 
     WHERE id = $3 
     RETURNING *`,
    [status, reviewedBy, applicationId]
  );
  return result.rows[0];
};

module.exports = {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
};

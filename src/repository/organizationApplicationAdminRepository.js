const db = require('../config/db');

const getOrganizationApplicationAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*) AS total_applications,
      COALESCE(SUM(oa.status = 'PENDING'), 0) AS total_pending,
      COALESCE(SUM(oa.status = 'APPROVED'), 0) AS total_approved,
      COALESCE(SUM(oa.status = 'REJECTED'), 0) AS total_rejected
    FROM organization_applications oa
  `);
  const row = result.rows[0];
  return {
    total_applications: parseInt(row.total_applications, 10),
    total_pending: parseInt(row.total_pending, 10),
    total_approved: parseInt(row.total_approved, 10),
    total_rejected: parseInt(row.total_rejected, 10),
  };
};

const getAllApplications = async ({ search, status, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    conditions.push('(oa.org_name LIKE ? OR oa.email LIKE ?)');
  }

  if (status) {
    values.push(status);
    conditions.push('oa.status = ?');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM organization_applications oa ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get applications with pagination
  values.push(Number(limit));
  values.push(Number(offset));

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
    LIMIT ? OFFSET ?`,
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
    WHERE oa.id = ?`,
    [applicationId]
  );
  return result.rows[0];
};

const updateApplicationStatus = async (applicationId, status, reviewedBy) => {
  await db.query(
    `UPDATE organization_applications 
     SET status = ?, reviewed_by = ?, reviewed_at = NOW() 
     WHERE id = ?`,
    [status, reviewedBy, applicationId]
  );
  const result = await db.query('SELECT * FROM organization_applications WHERE id = ?', [applicationId]);
  return result.rows[0];
};

module.exports = {
  getOrganizationApplicationAdminStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
};

const db = require('../config/db');

const createOrganizationApplication = async ({
  user_id,
  org_name,
  org_type,
  contact,
  email,
  description,
  status,
}) => {
  const result = await db.query(
    `INSERT INTO organization_applications (user_id, org_name, org_type, contact, email, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user_id,
      org_name,
      org_type || null,
      contact || null,
      email || null,
      description || null,
      status || 'PENDING',
    ],
  );
  return result.rows[0];
};

const findPendingApplicationByUserId = async (userId) => {
  const result = await db.query(
    `SELECT *
     FROM organization_applications
     WHERE user_id = $1 AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return result.rows[0];
};

const findLatestApplicationByUserId = async (userId) => {
  const result = await db.query(
    `SELECT *
     FROM organization_applications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return result.rows[0];
};

module.exports = {
  createOrganizationApplication,
  findPendingApplicationByUserId,
  findLatestApplicationByUserId,
};

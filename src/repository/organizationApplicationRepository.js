const db = require('../config/db');
const { newId } = require('../utils/uuid');

const createOrganizationApplication = async ({
  user_id,
  org_name,
  org_type,
  contact,
  email,
  description,
  status,
}) => {
  const applicationId = newId();
  await db.query(
    `INSERT INTO organization_applications (id, user_id, org_name, org_type, contact, email, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      applicationId,
      user_id,
      org_name,
      org_type || null,
      contact || null,
      email || null,
      description || null,
      status || 'PENDING',
    ],
  );
  const result = await db.query('SELECT * FROM organization_applications WHERE id = ?', [applicationId]);
  return result.rows[0];
};

const findPendingApplicationByUserId = async (userId) => {
  const result = await db.query(
    `SELECT *
     FROM organization_applications
     WHERE user_id = ? AND status = 'PENDING'
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
     WHERE user_id = ?
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

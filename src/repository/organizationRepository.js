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

module.exports = {
  findOrganizationById,
  findOrganizationByUserId,
  isOrganizationOwner,
};


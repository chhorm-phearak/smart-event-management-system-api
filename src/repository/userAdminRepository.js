const db = require('../config/db');

const getUserAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE u.status = 'ACTIVE')::int AS total_active,
      COUNT(*) FILTER (WHERE u.status = 'INACTIVE')::int AS total_inactive,
      COUNT(*) FILTER (WHERE u.status = 'SUSPENDED')::int AS total_suspended
    FROM users u
    WHERE u.is_deleted = FALSE
  `);
  const row = result.rows[0];
  return {
    total_users: parseInt(row.total_users, 10),
    total_active: parseInt(row.total_active, 10),
    total_inactive: parseInt(row.total_inactive, 10),
    total_suspended: parseInt(row.total_suspended, 10),
  };
};

const getAllUsers = async ({ search, status, role_id, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = ['u.is_deleted = FALSE'];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`u.status = $${values.length}`);
  }

  if (role_id) {
    values.push(role_id);
    conditions.push(`u.role_id = $${values.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get users with pagination
  values.push(limit);
  values.push(offset);

  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.gender,
      u.status,
      u.role_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.user_id = u.id
            AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
        ) THEN 'Organization'
      END AS role,
      u.created_at,
      u.updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return {
    users: result.rows,
    total,
    limit,
    offset,
  };
};

const getUserById = async (userId) => {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.gender,
      u.status,
      u.role_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.user_id = u.id
            AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
        ) THEN 'Organization'
      END AS role,
      u.created_at,
      u.updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const updateUserStatus = async (userId, status) => {
  const result = await db.query(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
    [status, userId]
  );
  return result.rows[0];
};

const updateUserRole = async (userId, roleId) => {
  const result = await db.query(
    `UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
    [roleId, userId]
  );
  return result.rows[0];
};

const deleteUser = async (userId) => {
  const result = await db.query(
    `UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId]
  );
  return result.rows[0];
};

const editUser = async (userId, userData) => {
  const { first_name, last_name, email, gender, contact, address, date_of_birth } = userData;
  
  // Start transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // Update users table
    const userUpdateFields = [];
    const userValues = [];
    let paramIndex = 1;
    
    if (first_name !== undefined) {
      userUpdateFields.push(`first_name = $${paramIndex++}`);
      userValues.push(first_name);
    }
    if (last_name !== undefined) {
      userUpdateFields.push(`last_name = $${paramIndex++}`);
      userValues.push(last_name);
    }
    if (email !== undefined) {
      userUpdateFields.push(`email = $${paramIndex++}`);
      userValues.push(email);
    }
    if (gender !== undefined) {
      userUpdateFields.push(`gender = $${paramIndex++}`);
      userValues.push(gender);
    }
    
    if (userUpdateFields.length > 0) {
      userUpdateFields.push(`updated_at = NOW()`);
      userValues.push(userId);
      
      const userQuery = `
        UPDATE users 
        SET ${userUpdateFields.join(', ')} 
        WHERE id = $${paramIndex} AND is_deleted = FALSE 
        RETURNING id, first_name, last_name, email, gender, status, role_id, created_at, updated_at
      `;
      
      await client.query(userQuery, userValues);
    }
    
    // Update user_profile table
    const profileUpdateFields = [];
    const profileValues = [];
    paramIndex = 1;
    
    if (contact !== undefined) {
      profileUpdateFields.push(`contact = $${paramIndex++}`);
      profileValues.push(contact);
    }
    if (address !== undefined) {
      profileUpdateFields.push(`address = $${paramIndex++}`);
      profileValues.push(address);
    }
    if (date_of_birth !== undefined) {
      profileUpdateFields.push(`date_of_birth = $${paramIndex++}`);
      profileValues.push(date_of_birth);
    }
    
    if (profileUpdateFields.length > 0) {
      profileValues.push(userId);
      
      // Check if profile exists first
      const profileExists = await client.query(
        'SELECT user_id FROM user_profile WHERE user_id = $1',
        [userId]
      );
      
      if (profileExists.rows.length > 0) {
        // Update existing profile
        const profileQuery = `
          UPDATE user_profile 
          SET ${profileUpdateFields.join(', ')} 
          WHERE user_id = $${paramIndex}
        `;
        await client.query(profileQuery, profileValues);
      } else {
        // Insert new profile
        profileUpdateFields.push('user_id = $' + (paramIndex + 1));
        const profileQuery = `
          INSERT INTO user_profile (${profileUpdateFields.map((field, i) => field.split(' = ')[0]).join(', ')})
          VALUES (${profileUpdateFields.map((_, i) => '$' + (i + 1)).join(', ')})
        `;
        await client.query(profileQuery, [...profileValues.slice(0, -1), userId]);
      }
    }
    
    // Get updated user data
    const result = await client.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.gender,
        u.status,
        u.role_id,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM organizations o
            WHERE o.user_id = u.id
              AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
          ) THEN 'Organization'
        END AS role,
        u.created_at,
        u.updated_at,
        up.img_url,
        up.contact,
        up.address,
        up.date_of_birth
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.id = $1 AND u.is_deleted = FALSE`,
      [userId]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getUserAdminStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  editUser,
};

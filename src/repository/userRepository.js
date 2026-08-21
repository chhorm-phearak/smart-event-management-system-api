const db = require('../config/db');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [email]
  );
  return result.rows[0];
};

const findByUsername = async (username) => {
  const result = await db.query(
    'SELECT * FROM users WHERE username = $1 AND is_deleted = FALSE',
    [username]
  );
  return result.rows[0];
};

const createUser = async ({ role_id, first_name, last_name, email, password, gender = null, organization = null, status = 'PENDING', email_verification_token = null, email_verification_expires_at = null }) => {
  const result = await db.query(
    `INSERT INTO users (role_id, first_name, last_name, email, password, gender, organization, status, email_verified, email_verification_token, email_verification_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10)
     RETURNING *`,
    [role_id, first_name, last_name, email, password, gender, organization, status, email_verification_token, email_verification_expires_at]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE',
    [id]
  );
  return result.rows[0];
};

const updatePassword = async (userId, hashedPassword) => {
  await db.query('UPDATE users SET password = $1 WHERE id = $2', [
    hashedPassword,
    userId,
  ]);
};

const setEmailVerificationToken = async (userId, token, expiresAt) => {
  const result = await db.query(
    `UPDATE users 
     SET email_verification_token = $1, email_verification_expires_at = $2, updated_at = NOW()
     WHERE id = $3 AND is_deleted = FALSE
     RETURNING *`,
    [token, expiresAt, userId]
  );
  return result.rows[0];
};

const findByVerificationToken = async (token) => {
  console.log('findByVerificationToken called with:', token);
  
  // First check if ANY user has this token
  const allTokens = await db.query(
    `SELECT email, email_verification_token FROM users WHERE email_verification_token IS NOT NULL`
  );
  console.log('All users with tokens:', allTokens.rows);
  
  const result = await db.query(
    `SELECT * FROM users 
     WHERE email_verification_token = $1 
     AND is_deleted = FALSE`,
    [token]
  );
  console.log('Query result rows:', result.rows.length);
  return result.rows[0];
};

const verifyEmail = async (userId) => {
  const result = await db.query(
    `UPDATE users 
     SET email_verified = TRUE, 
         status = 'ACTIVE',
         email_verification_token = NULL, 
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $1 AND is_deleted = FALSE
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
};

const createUserProfile = async (userId, { first_name, last_name, email, contact }) => {
  const result = await db.query(
    `INSERT INTO user_profile (user_id, first_name, last_name, email, contact)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       contact = EXCLUDED.contact,
       updated_at = NOW()
     RETURNING *`,
    [userId, first_name, last_name, email, contact]
  );
  return result.rows[0];
};

const updateProfile = async (userId, { 
  first_name, 
  last_name, 
  email, 
  img_url, 
  contact, 
  address, 
  date_of_birth,
  gender 
}) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Update users table
    const userUpdates = [];
    const userValues = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      userUpdates.push(`first_name = $${paramCount++}`);
      userValues.push(first_name);
    }
    if (last_name !== undefined) {
      userUpdates.push(`last_name = $${paramCount++}`);
      userValues.push(last_name);
    }
    if (email !== undefined) {
      userUpdates.push(`email = $${paramCount++}`);
      userValues.push(email);
    }

    if (userUpdates.length > 0) {
      userValues.push(userId);
      const userQuery = `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *`;
      await client.query(userQuery, userValues);
    }

    // Update user_profile table
    const profileUpdates = [];
    const profileValues = [];
    paramCount = 1;

    if (img_url !== undefined) {
      profileUpdates.push(`img_url = $${paramCount++}`);
      profileValues.push(img_url);
    }
    if (contact !== undefined) {
      profileUpdates.push(`contact = $${paramCount++}`);
      profileValues.push(contact);
    }
    if (address !== undefined) {
      profileUpdates.push(`address = $${paramCount++}`);
      profileValues.push(address);
    }
    if (date_of_birth !== undefined) {
      profileUpdates.push(`date_of_birth = $${paramCount++}`);
      profileValues.push(date_of_birth);
    }
    if (gender !== undefined) {
      profileUpdates.push(`gender = $${paramCount++}`);
      profileValues.push(gender);
    }

    if (profileUpdates.length > 0) {
      profileValues.push(userId);
      const profileQuery = `UPDATE user_profile SET ${profileUpdates.join(', ')}, updated_at = NOW() WHERE user_id = $${paramCount}`;
      await client.query(profileQuery, profileValues);
    }

    await client.query('COMMIT');
    
    // Return the complete updated profile
    return await getUserProfile(userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getUserProfile = async (userId) => {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.organization,
      u.gender,
      u.status,
      u.role_id,
      u.created_at,
      u.updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth,
      up.created_at as profile_created_at,
      up.updated_at as profile_updated_at
    FROM users u
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const listUsers = async ({ search, limit = 10, offset = 0 } = {}) => {
  const values = [];
  let whereClause = 'is_deleted = FALSE';

  if (search) {
    values.push(`%${search}%`);
    whereClause += ` AND full_name ILIKE $${values.length}`;
  }

  values.push(limit);
  values.push(offset);

  const limitIndex = values.length - 1;
  const offsetIndex = values.length;

  const result = await db.query(
    `SELECT id, full_name, first_name, last_name, email, status, role_id
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return result.rows;
};

const searchUsersByEmail = async ({ email, limit = 10, offset = 0 } = {}) => {
  if (!email || !email.trim()) {
    return [];
  }
  const result = await db.query(
    `SELECT id, full_name, first_name, last_name, email, status, role_id
     FROM users
     WHERE is_deleted = FALSE AND email ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${email.trim()}%`, limit, offset]
  );
  return result.rows;
};

module.exports = {
  findByEmail,
  findByUsername,
  createUser,
  findById,
  updatePassword,
  setEmailVerificationToken,
  findByVerificationToken,
  verifyEmail,
  updateProfile,
  createUserProfile,
  getUserProfile,
  listUsers,
  searchUsersByEmail,
};






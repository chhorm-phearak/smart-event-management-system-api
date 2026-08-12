const db = require('../config/db');
const { newId } = require('../utils/uuid');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = ? AND is_deleted = FALSE',
    [email]
  );
  return result.rows[0];
};

const findByUsername = async (username) => {
  const result = await db.query(
    'SELECT * FROM users WHERE username = ? AND is_deleted = FALSE',
    [username]
  );
  return result.rows[0];
};

const createUser = async ({ role_id, first_name, last_name, email, password, status = 'PENDING', email_verification_token = null, email_verification_expires_at = null }) => {
  const userId = newId();
  await db.query(
    `INSERT INTO users (id, role_id, first_name, last_name, email, password, status, email_verified, email_verification_token, email_verification_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
    [userId, role_id, first_name, last_name, email, password, status, email_verification_token, email_verification_expires_at]
  );
  return await findById(userId);
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM users WHERE id = ? AND is_deleted = FALSE',
    [id]
  );
  return result.rows[0];
};

const updatePassword = async (userId, hashedPassword) => {
  await db.query('UPDATE users SET password = ? WHERE id = ?', [
    hashedPassword,
    userId,
  ]);
};

const setEmailVerificationToken = async (userId, token, expiresAt) => {
  await db.query(
    `UPDATE users 
     SET email_verification_token = ?, email_verification_expires_at = ?, updated_at = NOW()
     WHERE id = ? AND is_deleted = FALSE`,
    [token, expiresAt, userId]
  );
  return await findById(userId);
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
     WHERE email_verification_token = ? 
     AND is_deleted = FALSE`,
    [token]
  );
  console.log('Query result rows:', result.rows.length);
  return result.rows[0];
};

const verifyEmail = async (userId) => {
  await db.query(
    `UPDATE users 
     SET email_verified = TRUE, 
         status = 'ACTIVE',
         email_verification_token = NULL, 
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE id = ? AND is_deleted = FALSE`,
    [userId]
  );
  return await findById(userId);
};

const createUserProfile = async (userId, { first_name, last_name, email, contact }) => {
  await db.query(
    `INSERT INTO user_profile (id, user_id, first_name, last_name, email, contact)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name),
       last_name = VALUES(last_name),
       email = VALUES(email),
       contact = VALUES(contact),
       updated_at = NOW()`,
    [newId(), userId, first_name, last_name, email, contact]
  );
  const result = await db.query('SELECT * FROM user_profile WHERE user_id = ?', [userId]);
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

    if (first_name !== undefined) {
      userUpdates.push('first_name = ?');
      userValues.push(first_name);
    }
    if (last_name !== undefined) {
      userUpdates.push('last_name = ?');
      userValues.push(last_name);
    }
    if (email !== undefined) {
      userUpdates.push('email = ?');
      userValues.push(email);
    }

    if (userUpdates.length > 0) {
      userValues.push(userId);
      const userQuery = `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = ? AND is_deleted = FALSE`;
      await client.query(userQuery, userValues);
    }

    // Update user_profile table
    const profileUpdates = [];
    const profileValues = [];

    if (img_url !== undefined) {
      profileUpdates.push('img_url = ?');
      profileValues.push(img_url);
    }
    if (contact !== undefined) {
      profileUpdates.push('contact = ?');
      profileValues.push(contact);
    }
    if (address !== undefined) {
      profileUpdates.push('address = ?');
      profileValues.push(address);
    }
    if (date_of_birth !== undefined) {
      profileUpdates.push('date_of_birth = ?');
      profileValues.push(date_of_birth);
    }
    if (gender !== undefined) {
      profileUpdates.push('gender = ?');
      profileValues.push(gender);
    }

    if (profileUpdates.length > 0) {
      profileValues.push(userId);
      const profileQuery = `UPDATE user_profile SET ${profileUpdates.join(', ')}, updated_at = NOW() WHERE user_id = ?`;
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
    WHERE u.id = ? AND u.is_deleted = FALSE`,
    [userId]
  );
  return result.rows[0];
};

const listUsers = async ({ search, limit = 10, offset = 0 } = {}) => {
  const values = [];
  let whereClause = 'is_deleted = FALSE';

  if (search) {
    values.push(`%${search}%`);
    whereClause += ' AND full_name LIKE ?';
  }

  values.push(Number(limit));
  values.push(Number(offset));

  const result = await db.query(
    `SELECT id, full_name, first_name, last_name, email, status, role_id
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
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
     WHERE is_deleted = FALSE AND email LIKE ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [`%${email.trim()}%`, Number(limit), Number(offset)]
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






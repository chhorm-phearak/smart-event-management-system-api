const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  findByEmail,
  createUser,
  updatePassword,
  updateProfile,
  findById,
  createUserProfile,
  getUserProfile,
  setEmailVerificationToken,
  findByVerificationToken,
  verifyEmail: verifyEmailInDb,
} = require('../repository/userRepository');
const { sendVerificationEmail } = require('../services/emailService');
const {
  createResetToken,
  findValidResetRecord,
  markUsed,
} = require('../repository/passwordResetRepository');
const { findOrganizationByUserId } = require('../repository/organizationRepository');
const {
  handleFailedLogin,
  handleSuccessfulLogin,
  isAccountLocked,
  getLockoutRemainingMinutes,
} = require('../repository/accountLockoutRepository');

// simple in-memory token blacklist for logout (per process)
const tokenBlacklist = new Set();

const generateToken = (user) => {
  const payload = { sub: user.id, email: user.email, role_id: user.role_id };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, secret, { expiresIn });
};

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, contact } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: 'first_name, last_name, email and password are required' });
    }

    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('Generated verification token:', verificationToken);
    console.log('Token expires at:', verificationExpires);

    const hashed = await bcrypt.hash(password, 10);
    // Create user with PENDING status and verification token
    const user = await createUser({ 
      role_id: 'user_role', 
      first_name, 
      last_name, 
      email, 
      password: hashed,
      status: 'PENDING',
      email_verification_token: verificationToken,
      email_verification_expires_at: verificationExpires,
    });

    console.log('Created user with token:', user.email_verification_token);

    // Create user profile
    await createUserProfile(user.id, {
      first_name,
      last_name,
      email,
      contact: contact || null,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, first_name);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      // Continue registration even if email fails - user can resend later
    }

    return res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: { 
          id: user.id, 
          first_name: user.first_name, 
          last_name: user.last_name,
          email: user.email, 
          role_id: user.role_id,
          email_verified: false,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    // Check if account is locked before proceeding
    const isLocked = await isAccountLocked(email);

    if (isLocked) {
      const minutes = await getLockoutRemainingMinutes(email);
      const timeMessage = minutes === 1 ? '1 minute' : `${minutes} minutes`;
      
      return res.status(423).json({ 
        message: `Account temporarily locked due to multiple failed login attempts. Please log in again after ${timeMessage}.`,
        error: 'ACCOUNT_LOCKED',
        lockout_minutes: minutes
      });
    }

    const user = await findByEmail(email);
    if (!user) {
      // Handle failed login for non-existent user
      await handleFailedLogin(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        error: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Handle failed login
      await handleFailedLogin(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Handle successful login - reset lockout state
    await handleSuccessfulLogin(email);

    const token = generateToken(user);
    const organizations = await findOrganizationByUserId(user.id);
    const organization_id = organizations?.length > 0 ? organizations[0].id : null;

    return res.json({
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role_id: user.role_id,
          organization_id,
        },
        token,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// naive forgot-password flow:
// - generate reset_token stored in a separate table (created here)
// - in real app, email this token; here we just return it in response for simplicity
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const user = await findByEmail(email);
    if (!user) {
      // do not reveal whether email exists
      return res.json({ message: 'If that email exists, a reset token has been generated' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 15 minutes

    await createResetToken(user.id, resetToken, expiresAt);

    // in production, send via email
    return res.json({
      message: 'Password reset token generated',
      data: { reset_token: resetToken, expires_at: expiresAt },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) {
      return res.status(400).json({ message: 'reset_token and new_password are required' });
    }

    const record = await findValidResetRecord(reset_token);
    if (!record) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset token expired' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await updatePassword(record.user_id, hashed);
    await markUsed(record.id);

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ message: 'Authorization header missing or invalid' });
  }
  const token = authHeader.split(' ')[1];
  tokenBlacklist.add(token);
  return res.json({ message: 'Logged out successfully' });
};

const isTokenBlacklisted = (token) => tokenBlacklist.has(token);

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await findByVerificationToken(token);
    
    if (!user) {
      // Token not found - could be already used (verified) or invalid
      // Return success to handle duplicate calls gracefully
      return res.json({ 
        message: 'Email verified successfully. You can now log in.',
      });
    }

    // Check if token has expired
    if (new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.json({ 
        message: 'Email verified successfully. You can now log in.',
      });
    }

    // Verify the email
    await verifyEmailInDb(user.id);

    return res.json({ 
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If that email exists and is not verified, a new verification email has been sent.' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await setEmailVerificationToken(user.id, verificationToken, verificationExpires);

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, user.first_name);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
    }

    return res.json({ message: 'Verification email sent successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          gender: profile.gender,
          status: profile.status,
          role_id: profile.role_id,
          img_url: profile.img_url,
          contact: profile.contact,
          address: profile.address,
          date_of_birth: profile.date_of_birth,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      first_name, 
      last_name, 
      email, 
      img_url, 
      contact, 
      address, 
      date_of_birth,
      gender 
    } = req.body;

    // Check if email is being updated and if it's already in use by another user
    if (email) {
      const existingUser = await findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }

    const updatedUser = await updateProfile(userId, { 
      first_name, 
      last_name, 
      email, 
      img_url, 
      contact, 
      address, 
      date_of_birth,
      gender 
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the complete updated profile
    const profile = await getUserProfile(userId);

    return res.json({
      message: 'Profile updated successfully',
      data: {
        user: {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          gender: profile.gender,
          status: profile.status,
          role_id: profile.role_id,
          img_url: profile.img_url,
          contact: profile.contact,
          address: profile.address,
          date_of_birth: profile.date_of_birth,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  isTokenBlacklisted,
  verifyEmail,
  resendVerification,
  getProfile,
  updateUserProfile,
};



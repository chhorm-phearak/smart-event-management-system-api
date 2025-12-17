const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  findByEmail,
  createUser,
  updatePassword,
} = require('../repository/userRepository');
const {
  createResetToken,
  findValidResetRecord,
  markUsed,
} = require('../repository/passwordResetRepository');

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
    const { role_id, full_name, email, password, phone } = req.body;

    if (!role_id || !full_name || !email || !password) {
      return res.status(400).json({ message: 'role_id, full_name, email and password are required' });
    }

    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({ role_id, full_name, email, password: hashed, phone });
    const token = generateToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      data: {
        user: { id: user.id, full_name: user.full_name, email: user.email, role_id: user.role_id, phone: user.phone },
        token,
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

    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      data: {
        user: { id: user.id, full_name: user.full_name, email: user.email, role_id: user.role_id, phone: user.phone },
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
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

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

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  isTokenBlacklisted,
};



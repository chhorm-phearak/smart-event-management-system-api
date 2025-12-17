const jwt = require('jsonwebtoken');
const { findById } = require('../repository/userRepository');
const { isTokenBlacklisted } = require('../controllers/authController');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = { id: user.id, email: user.email, role_id: user.role_id };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;



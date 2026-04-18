const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  verifyEmail,
  resendVerification,
  getProfile,
  updateUserProfile,
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Debug: Log all auth requests
router.use((req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path}`, req.query);
  next();
});

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateUserProfile);

module.exports = router;






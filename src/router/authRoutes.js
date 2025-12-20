const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  updateUserProfile,
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authMiddleware, logout);
router.put('/profile', authMiddleware, updateUserProfile);

module.exports = router;






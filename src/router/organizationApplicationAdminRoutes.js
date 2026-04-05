const express = require('express');
const {
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
} = require('../controllers/organizationApplicationAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllApplications);
router.get('/:id', authMiddleware, adminMiddleware, getApplicationById);
router.post('/:id/approve', authMiddleware, adminMiddleware, approveApplication);
router.post('/:id/reject', authMiddleware, adminMiddleware, rejectApplication);

module.exports = router;

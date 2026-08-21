const express = require('express');
const {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  updateOrganization,
  deleteOrganization,
} = require('../controllers/organizationAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllOrganizations);
router.get('/:id', authMiddleware, adminMiddleware, getOrganizationById);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrganizationStatus);
router.put('/:id', authMiddleware, adminMiddleware, updateOrganization);
router.delete('/:id', authMiddleware, adminMiddleware, deleteOrganization);

module.exports = router;

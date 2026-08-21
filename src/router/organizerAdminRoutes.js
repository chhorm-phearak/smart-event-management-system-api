const express = require('express');
const {
  getOrganizerById,
  getAllOrganizers,
} = require('../controllers/organizerAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllOrganizers);
router.get('/:id', authMiddleware, adminMiddleware, getOrganizerById);

module.exports = router;

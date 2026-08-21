const express = require('express');
const {
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
  editEvent,
} = require('../controllers/eventAdminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllEvents);
router.get('/:id', authMiddleware, adminMiddleware, getEventById);
router.patch('/:id', authMiddleware, adminMiddleware, editEvent);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateEventStatus);
router.delete('/:id', authMiddleware, adminMiddleware, deleteEvent);

module.exports = router;

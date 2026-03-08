const express = require('express');
const {
  getAll,
  getUnreadCount,
  getById,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.get('/:id', getById);
router.patch('/:id/read', markAsRead);

module.exports = router;

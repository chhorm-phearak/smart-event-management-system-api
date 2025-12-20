const express = require('express');
const {
  create,
  getAll,
  getById,
  update,
  remove,
  inviteMember,
  removeMember,
} = require('../controllers/groupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All group routes require authentication
router.post('/', authMiddleware, create);
router.get('/', authMiddleware, getAll);
router.get('/:id', authMiddleware, getById);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
router.post('/:id/invite', authMiddleware, inviteMember);
router.delete('/:id/members/:member_id', authMiddleware, removeMember);

module.exports = router;


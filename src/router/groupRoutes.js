const express = require('express');
const {
  create,
  getAll,
  getById,
  getOrganizationGroups,
  getStats,
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
router.get('/organization', authMiddleware, getOrganizationGroups);
router.get('/:id', authMiddleware, getById);
router.get('/:id/stats', authMiddleware, getStats);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
router.post('/:id/invite', authMiddleware, inviteMember);
router.delete('/:id/members/:member_id', authMiddleware, removeMember);

module.exports = router;


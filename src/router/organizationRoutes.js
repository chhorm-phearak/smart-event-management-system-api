const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  getMembers,
  getMemberById,
  addMember,
  removeMember,
} = require('../controllers/organizationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, create);
router.get('/:id', authMiddleware, getById);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
// Organization members
router.get('/:id/members', authMiddleware, getMembers);
router.get('/:id/members/:memberId', authMiddleware, getMemberById);
router.post('/:id/members', authMiddleware, addMember);
router.delete('/:id/members/:memberId', authMiddleware, removeMember);

module.exports = router;

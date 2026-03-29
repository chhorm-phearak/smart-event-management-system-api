const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  register,
  getCurrentInfo,
  getMembersForOrganizer,
  getMembers,
  getMemberById,
  addMember,
  removeMemberForOrganizer,
  removeMember,
  getDashboardStats,
  getDashboardEvents,
} = require('../controllers/organizationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAll);
router.get('/members', authMiddleware, getMembersForOrganizer);
router.get('/current', authMiddleware, getCurrentInfo);
router.get('/dashboard/stats', authMiddleware, getDashboardStats);
router.get('/dashboard/events', authMiddleware, getDashboardEvents);
router.post('/', authMiddleware, create);
router.post('/applications', authMiddleware, register);
router.get('/:id', authMiddleware, getById);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
// Organization members
router.delete('/members/:memberId', authMiddleware, removeMemberForOrganizer);
router.get('/:id/members', authMiddleware, getMembers);
router.get('/:id/members/:memberId', authMiddleware, getMemberById);
router.post('/:id/members', authMiddleware, addMember);
router.delete('/:id/members/:memberId', authMiddleware, removeMember);

module.exports = router;

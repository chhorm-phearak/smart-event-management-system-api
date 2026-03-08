const express = require('express');
const {
  sendInvite,
  inviteToGroup,
  acceptInvite,
  rejectInvite,
  cancelInvite,
  getReceived,
  getSent,
  getById,
} = require('../controllers/invitationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', sendInvite);
router.post('/group/invite', inviteToGroup);
router.get('/received', getReceived);
router.get('/sent', getSent);
router.get('/:id', getById);
router.post('/:id/accept', acceptInvite);
router.post('/:id/reject', rejectInvite);
router.post('/:id/cancel', cancelInvite);

module.exports = router;

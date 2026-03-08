const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const inviteLinkController = require('../controllers/inviteLinkController');

// Protected routes (require authentication)
router.use(authMiddleware);

// Group invite link management
router.post('/groups/:group_id/invite-links', inviteLinkController.create);
router.get('/groups/:group_id/invite-links', inviteLinkController.getGroupLinks);

// Invite link CRUD operations
router.put('/invite-links/:id', inviteLinkController.update);
router.delete('/invite-links/:id', inviteLinkController.remove);

// Public route for validation (no auth required)
router.get('/invite/validate/:token', inviteLinkController.validate);

// Public route for getting invite link information (no auth required)
router.get('/invite/info/:token', inviteLinkController.getInviteInfo);

// Protected route for accepting invite (requires auth)
router.post('/invite/accept/:token', inviteLinkController.accept);

module.exports = router;

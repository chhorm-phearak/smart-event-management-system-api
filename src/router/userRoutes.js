const express = require('express');
const { getUsers, getUsersByEmail } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// GET /api/users?search=<username>
router.get('/', getUsers);

// GET /api/users/search/email?email=<term> or ?q=<term>
router.get('/search/email', getUsersByEmail);

module.exports = router;


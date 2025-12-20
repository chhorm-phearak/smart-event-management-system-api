const express = require('express');
const {
  create,
  update,
  remove,
  getById,
  getAll,
  getAllByGroup,
} = require('../controllers/eventController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All event routes require authentication
router.get('/', authMiddleware, getAll);
router.get('/group/:group_id', authMiddleware, getAllByGroup);
router.post('/', authMiddleware, create);
router.get('/:id', authMiddleware, getById);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);

module.exports = router;


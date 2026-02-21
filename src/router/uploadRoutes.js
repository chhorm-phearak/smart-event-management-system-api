const express = require('express');
const { uploadSingle: uploadSingleHandler, uploadMultiple: uploadMultipleHandler } = require('../controllers/uploadController');
const { uploadSingle, uploadMultiple } = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/single', authMiddleware, uploadSingle, uploadSingleHandler);
router.post('/multiple', authMiddleware, uploadMultiple, uploadMultipleHandler);

module.exports = router;

const express = require('express');
const { getMyEventsWithStats, getEventAttendees } = require('../controllers/attendeeController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/my-events/stats', authMiddleware, getMyEventsWithStats);
router.get('/:eventId/attendees', authMiddleware, getEventAttendees);

module.exports = router;

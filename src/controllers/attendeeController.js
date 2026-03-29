const {
  getCreatedEventsWithAttendeeStats,
  getEventAttendeeDetails,
} = require('../services/attendeeService');

const getMyEventsWithStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = '1', limit = '10', search = '' } = req.query;

    const { events, pagination } = await getCreatedEventsWithAttendeeStats(userId, {
      page,
      limit,
      search,
    });

    return res.json({
      message: 'Events with attendee statistics retrieved successfully',
      data: { events, pagination },
    });
  } catch (err) {
    console.error('Error retrieving events with attendee stats:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getEventAttendees = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required' });
    }

    const result = await getEventAttendeeDetails(eventId, userId, userRole);

    return res.json({
      message: 'Event attendees retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error retrieving event attendees:', err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getMyEventsWithStats,
  getEventAttendees,
};

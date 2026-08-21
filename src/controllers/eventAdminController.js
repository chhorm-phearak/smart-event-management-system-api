const {
  getAllEventsService,
  getEventByIdService,
  updateEventStatusService,
  deleteEventService,
  editEventService,
} = require('../services/eventAdminService');

const getAllEvents = async (req, res) => {
  try {
    const { search, status, category, organization_id, page = 1, limit = 10 } = req.query;

    const result = await getAllEventsService({
      search,
      status,
      category,
      organization_id,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      message: 'Events retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getEventByIdService(id);

    if (!result) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json({
      message: 'Event retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const event = await updateEventStatusService(id, status);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json({
      message: 'Event status updated successfully',
      data: { event },
    });
  } catch (err) {
    if (err.message.includes('Invalid status')) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await deleteEventService(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json({
      message: 'Event deleted successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const editEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;

    if (Object.keys(eventData).length === 0) {
      return res.status(400).json({ message: 'At least one field must be provided for update' });
    }

    const result = await editEventService(id, eventData);

    return res.json({
      message: 'Event updated successfully',
      data: result,
    });
  } catch (err) {
    if (err.message.includes('Event not found') || err.message.includes('At least one field')) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
  editEvent,
};

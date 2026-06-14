const {
  getEventAdminStats,
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
} = require('../repository/eventAdminRepository');

const getAllEventsService = async ({ search, status, category, organization_id, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const [result, stats] = await Promise.all([
    getAllEvents({ search, status, category, organization_id, limit, offset }),
    getEventAdminStats(),
  ]);

  return {
    events: result.events,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
    stats,
  };
};

const getEventByIdService = async (eventId) => {
  return await getEventById(eventId);
};

const updateEventStatusService = async (eventId, status) => {
  const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status. Must be one of: DRAFT, PUBLISHED, CANCELLED, COMPLETED');
  }

  return await updateEventStatus(eventId, status);
};

const deleteEventService = async (eventId) => {
  return await deleteEvent(eventId);
};

module.exports = {
  getAllEventsService,
  getEventByIdService,
  updateEventStatusService,
  deleteEventService,
};

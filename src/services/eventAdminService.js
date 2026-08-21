const {
  getEventAdminStats,
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
  editEvent,
} = require('../repository/eventAdminRepository');
const {
  getEventAgenda,
  addEventAgenda,
  deleteEventAgenda,
  getEventStaff,
  addEventStaff,
  deleteEventStaff,
  getEventImages,
  findRegisteredUsersByEventId,
} = require('../repository/eventRepository');
const { sendEventUpdateEmail } = require('./emailService');
const { createNotifications } = require('./notificationService');

// Format a UTC timestamp for email display in Cambodia time
const formatEventTime = (utcDate) => {
  if (!utcDate) return '—';
  const date = new Date(utcDate);
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Build a list of changed fields from a map of updates and the existing event
const buildChangedFields = (existing, updates) => {
  const fieldMap = {
    title: 'Event Title',
    short_description: 'Short Description',
    long_description: 'Long Description',
    category: 'Category',
    location: 'Location',
    full_address: 'Address',
    start_time: 'Start Time',
    end_time: 'End Time',
    duration: 'Duration',
    capacity: 'Capacity',
    status: 'Status',
    is_public: 'Visibility',
    organization_id: 'Organization',
    group_id: 'Group',
  };

  const changed = [];
  for (const [key, label] of Object.entries(fieldMap)) {
    if (updates[key] === undefined) continue;
    const oldValue = existing[key];
    const newValue = updates[key];
    const isDate = key === 'start_time' || key === 'end_time';
    const oldTime = new Date(oldValue || 0).getTime();
    const newTime = new Date(newValue || 0).getTime();
    const isChanged = isDate
      ? Number.isNaN(oldTime) !== Number.isNaN(newTime) || oldTime !== newTime
      : oldValue !== newValue;

    if (isChanged) {
      changed.push({
        label,
        oldValue: isDate ? formatEventTime(oldValue) : (oldValue || '—'),
        newValue: isDate ? formatEventTime(newValue) : (newValue || '—'),
      });
    }
  }
  return changed;
};

// Notify all registered users when an event is updated
const notifyRegisteredUsersOfUpdate = async (eventId, updatedEvent, changedFields) => {
  if (!changedFields || changedFields.length === 0) return;

  const registeredUsers = await findRegisteredUsersByEventId(eventId);
  const eventUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}/events/${updatedEvent.id}`;

  for (const user of registeredUsers) {
    try {
      await sendEventUpdateEmail(
        user.email,
        user.first_name,
        updatedEvent,
        changedFields,
        eventUrl
      );
    } catch (emailErr) {
      console.error(`Failed to send update email to ${user.email}:`, emailErr);
    }
  }

  // Save in-app notifications for registered users
  if (registeredUsers.length > 0) {
    const notificationPayloads = registeredUsers.map((user) => ({
      user_id: user.id,
      event_id: updatedEvent.id,
      type: 'EVENT_UPDATED',
      title: `Event updated: ${updatedEvent.title}`,
      message: `The event "${updatedEvent.title}" was updated. Changes: ${changedFields.map((f) => `${f.label}: ${f.oldValue} → ${f.newValue}`).join(', ')}`,
      data: { event_id: updatedEvent.id, changed_fields: changedFields },
    }));

    try {
      await createNotifications(notificationPayloads);
    } catch (notifErr) {
      console.error('Failed to create event update notifications:', notifErr);
    }
  }
};

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
  const event = await getEventById(eventId);
  if (!event) {
    return null;
  }

  const [agenda, staff, images] = await Promise.all([
    getEventAgenda(eventId),
    getEventStaff(eventId),
    getEventImages(eventId),
  ]);

  return { event, agenda, staff, images };
};

const updateEventStatusService = async (eventId, status) => {
  const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status. Must be one of: DRAFT, PUBLISHED, CANCELLED, COMPLETED');
  }

  const existingEvent = await getEventById(eventId);
  const updatedEvent = await updateEventStatus(eventId, status);

  if (existingEvent && existingEvent.status !== status) {
    const changedFields = [{
      label: 'Status',
      oldValue: existingEvent.status,
      newValue: status,
    }];
    notifyRegisteredUsersOfUpdate(eventId, updatedEvent, changedFields)
      .catch((err) => console.error('Background event update email task failed:', err));
  }

  return updatedEvent;
};

const deleteEventService = async (eventId) => {
  return await deleteEvent(eventId);
};

const editEventService = async (eventId, eventData) => {
  // Admin can edit without any restrictions - no validation needed
  const { agenda, staff, ...eventFields } = eventData;

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  let updatedEvent;
  if (Object.keys(eventFields).length > 0) {
    updatedEvent = await editEvent(eventId, eventFields);
  } else {
    updatedEvent = existingEvent;
  }

  // Notify registered users of important changes (run in background)
  const changedFields = buildChangedFields(existingEvent, eventFields);
  notifyRegisteredUsersOfUpdate(eventId, updatedEvent, changedFields)
    .catch((err) => console.error('Background event update email task failed:', err));

  // Update agenda if provided (delete existing and re-add), otherwise return existing
  let agendaItems = [];
  if (agenda !== undefined && Array.isArray(agenda)) {
    await deleteEventAgenda(eventId);
    if (agenda.length > 0) {
      agendaItems = await addEventAgenda(eventId, agenda);
    }
  } else {
    agendaItems = await getEventAgenda(eventId);
  }

  // Update staff if provided (delete existing and re-add), otherwise return existing
  let staffMembers = [];
  if (staff !== undefined && Array.isArray(staff)) {
    await deleteEventStaff(eventId);
    if (staff.length > 0) {
      staffMembers = await addEventStaff(eventId, staff, updatedEvent.organization_id);
    }
  } else {
    staffMembers = await getEventStaff(eventId);
  }

  const images = await getEventImages(eventId);

  return { event: updatedEvent, agenda: agendaItems, staff: staffMembers, images };
};

module.exports = {
  getAllEventsService,
  getEventByIdService,
  updateEventStatusService,
  deleteEventService,
  editEventService,
};

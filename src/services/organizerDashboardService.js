const db = require('../config/db');
const {
  getEventAgenda,
  getEventStaff,
  getEventImages,
} = require('../repository/eventRepository');

const getOrganizerDashboardStats = async (organizerId) => {
  const now = new Date().toISOString();

  // Get all organizations owned by this user
  const orgsResult = await db.query(
    'SELECT id FROM organizations WHERE user_id = $1',
    [organizerId]
  );

  if (orgsResult.rows.length === 0) {
    return {
      total_events: 0,
      upcoming_events: 0,
      past_events: 0,
      total_attendees: 0,
    };
  }

  const orgIds = orgsResult.rows.map((o) => o.id);

  // Total events
  const totalEventsResult = await db.query(
    `SELECT COUNT(*) as total
     FROM events
     WHERE organization_id = ANY($1::uuid[])
       AND (is_deleted = FALSE OR is_deleted IS NULL)`,
    [orgIds]
  );
  const totalEvents = parseInt(totalEventsResult.rows[0].total);

  // Upcoming events (start_time >= now)
  const upcomingEventsResult = await db.query(
    `SELECT COUNT(*) as total
     FROM events
     WHERE organization_id = ANY($1::uuid[])
       AND (is_deleted = FALSE OR is_deleted IS NULL)
       AND start_time >= $2`,
    [orgIds, now]
  );
  const upcomingEvents = parseInt(upcomingEventsResult.rows[0].total);

  // Past events (start_time < now)
  const pastEventsResult = await db.query(
    `SELECT COUNT(*) as total
     FROM events
     WHERE organization_id = ANY($1::uuid[])
       AND (is_deleted = FALSE OR is_deleted IS NULL)
       AND start_time < $2`,
    [orgIds, now]
  );
  const pastEvents = parseInt(pastEventsResult.rows[0].total);

  // Total attendees (registrations for all events)
  const totalAttendeesResult = await db.query(
    `SELECT COUNT(*) as total
     FROM event_registrations er
     INNER JOIN events e ON er.event_id = e.id
     WHERE e.organization_id = ANY($1::uuid[])
       AND (e.is_deleted = FALSE OR e.is_deleted IS NULL)`,
    [orgIds]
  );
  const totalAttendees = parseInt(totalAttendeesResult.rows[0].total);

  return {
    total_events: totalEvents,
    upcoming_events: upcomingEvents,
    past_events: pastEvents,
    total_attendees: totalAttendees,
  };
};

const getEventsByOrganizerId = async (organizerId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  // Get all organizations owned by this user
  const orgsResult = await db.query(
    'SELECT id FROM organizations WHERE user_id = $1',
    [organizerId]
  );

  if (orgsResult.rows.length === 0) {
    return {
      events: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const orgIds = orgsResult.rows.map((o) => o.id);

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total
     FROM events
     WHERE organization_id = ANY($1::uuid[])
       AND (is_deleted = FALSE OR is_deleted IS NULL)`,
    [orgIds]
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated events
  const eventsResult = await db.query(
    `SELECT e.*, o.org_name as organization_name, g.name as group_name
     FROM events e
     LEFT JOIN organizations o ON e.organization_id = o.id
     LEFT JOIN groups g ON e.group_id = g.id
     WHERE e.organization_id = ANY($1::uuid[])
       AND (e.is_deleted = FALSE OR e.is_deleted IS NULL)
     ORDER BY e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [orgIds, limit, offset]
  );

  const events = eventsResult.rows;

  // Get current user's registration data for these events (if any)
  let registrationMap = {};
  if (events.length > 0 && organizerId) {
    const eventIds = events.map((e) => e.id);
    const regResult = await db.query(
      `SELECT event_id, id as registration_id, qr_image_path FROM event_registrations WHERE user_id = $1 AND event_id = ANY($2::uuid[])`,
      [organizerId, eventIds]
    );
    regResult.rows.forEach((row) => {
      registrationMap[row.event_id] = {
        registration_id: row.registration_id,
        qr_image_path: row.qr_image_path
      };
    });
  }

  // Fetch staff and agenda for each event
  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      const [agenda, staff, images] = await Promise.all([
        getEventAgenda(event.id),
        getEventStaff(event.id),
        getEventImages(event.id),
      ]);

      const registrationData = registrationMap[event.id] ?? null;

      return {
        ...event,
        agenda,
        staff,
        images,
        qr_ticket: registrationData ? registrationData.registration_id : null,
        qr_image_url: registrationData ? registrationData.qr_image_path : null,
      };
    })
  );

  return {
    events: eventsWithDetails,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getOrganizerDashboardStats,
  getEventsByOrganizerId,
};

const db = require('../config/db');
const {
  getEventAgenda,
  getEventStaff,
  getEventImages,
} = require('../repository/eventRepository');

const getPlatformDashboardStats = async () => {
  const [result, organizersResult] = await Promise.all([
    db.query(`
    SELECT
      (SELECT COUNT(*) FROM users u
       WHERE (u.is_deleted = FALSE OR u.is_deleted IS NULL)) AS total_users,
      (SELECT COUNT(*) FROM organizations o
       WHERE (o.is_deleted = FALSE OR o.is_deleted IS NULL)) AS total_organizers,
      (SELECT COUNT(*) FROM events e
       WHERE (e.is_deleted = FALSE OR e.is_deleted IS NULL)) AS total_events,
      (SELECT COUNT(*) FROM organization_applications oa
       WHERE (oa.is_deleted = FALSE OR oa.is_deleted IS NULL)) AS total_organizer_applications,
      (SELECT COUNT(*) FROM organization_applications oa
       WHERE oa.status = 'PENDING'
         AND (oa.is_deleted = FALSE OR oa.is_deleted IS NULL)) AS pending_applications
  `),
    db.query(`
    SELECT
      o.id,
      o.user_id,
      o.org_name,
      o.org_type,
      o.contact,
      o.email,
      o.description,
      o.status,
      o.created_at,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name,
      u.email AS owner_email,
      COALESCE(ec.cnt, 0) AS event_count
    FROM organizations o
    INNER JOIN users u ON u.id = o.user_id
      AND (u.is_deleted = FALSE OR u.is_deleted IS NULL)
    LEFT JOIN (
      SELECT organization_id, COUNT(*) AS cnt
      FROM events
      WHERE (is_deleted = FALSE OR is_deleted IS NULL)
      GROUP BY organization_id
    ) ec ON ec.organization_id = o.id
    WHERE (o.is_deleted = FALSE OR o.is_deleted IS NULL)
    ORDER BY event_count DESC, o.org_name ASC
  `),
  ]);

  const row = result.rows[0];
  const organizers = organizersResult.rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    org_name: r.org_name,
    org_type: r.org_type,
    contact: r.contact,
    email: r.email,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    owner_first_name: r.owner_first_name,
    owner_last_name: r.owner_last_name,
    owner_email: r.owner_email,
    event_count: parseInt(r.event_count, 10),
  }));

  return {
    total_users: parseInt(row.total_users, 10),
    total_organizers: parseInt(row.total_organizers, 10),
    total_events: parseInt(row.total_events, 10),
    total_organizer_applications: parseInt(row.total_organizer_applications, 10),
    pending_applications: parseInt(row.pending_applications, 10),
    organizers,
  };
};

const getEventsByOrganizerId = async (organizerId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  // Get all organizations owned by this user
  const orgsResult = await db.query(
    'SELECT id FROM organizations WHERE user_id = ?',
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
     WHERE organization_id IN (?)
       AND (is_deleted = FALSE OR is_deleted IS NULL)`,
    [orgIds]
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated events
  const eventsResult = await db.query(
    `SELECT e.*, o.org_name as organization_name, g.name as group_name
     FROM events e
     LEFT JOIN organizations o ON e.organization_id = o.id
     LEFT JOIN \`groups\` g ON e.group_id = g.id
     WHERE e.organization_id IN (?)
       AND (e.is_deleted = FALSE OR e.is_deleted IS NULL)
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    [orgIds, Number(limit), Number(offset)]
  );

  const events = eventsResult.rows;

  // Get current user's registration data for these events (if any)
  let registrationMap = {};
  if (events.length > 0 && organizerId) {
    const eventIds = events.map((e) => e.id);
    const regResult = await db.query(
      `SELECT event_id, id as registration_id, qr_image_path FROM event_registrations WHERE user_id = ? AND event_id IN (?)`,
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
  getPlatformDashboardStats,
  getEventsByOrganizerId,
};

const db = require('../config/db');
const { findEventById } = require('../repository/eventRepository');
const { isOrganizationOwner } = require('../repository/organizationRepository');

const getCreatedEventsWithAttendeeStats = async (userId, {
  page = 1,
  limit = 10,
  search = '',
} = {}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const dataParams = [userId];
  const totalParams = [userId];
  let searchClause = '';

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    dataParams.push(searchPattern, searchPattern);
    totalParams.push(searchPattern, searchPattern);
    searchClause = ' AND (e.title LIKE ? OR e.location LIKE ?)';
  }

  dataParams.push(safeLimit);
  dataParams.push(offset);

  const dataQuery = `SELECT 
      e.id as event_id,
      e.title as event_name,
      e.start_time as event_date_time,
      e.location,
      COALESCE(SUM(CASE WHEN er.id IS NOT NULL AND er.is_deleted = false AND er.status != 'CANCELLED' THEN 1 ELSE 0 END), 0) as total_registered,
      COALESCE(SUM(CASE WHEN er.id IS NOT NULL AND er.is_deleted = false AND er.status = 'CHECKED_IN' THEN 1 ELSE 0 END), 0) as total_checked_in
    FROM events e
    LEFT JOIN event_registrations er ON e.id = er.event_id
    WHERE e.created_by = ? AND e.is_deleted = false${searchClause}
    GROUP BY e.id, e.title, e.start_time, e.location
    ORDER BY e.start_time DESC
    LIMIT ?
    OFFSET ?`;

  const totalQuery = `SELECT COUNT(*) AS total
    FROM events e
    WHERE e.created_by = ? AND e.is_deleted = false${searchClause}`;

  const [dataResult, totalResult] = await Promise.all([
    db.query(dataQuery, dataParams),
    db.query(totalQuery, totalParams),
  ]);

  const total = parseInt(totalResult.rows[0]?.total || '0', 10);
  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);

  return {
    events: dataResult.rows.map(row => ({
      event_id: row.event_id,
      event_name: row.event_name,
      event_date_time: row.event_date_time,
      location: row.location,
      total_registered: parseInt(row.total_registered, 10),
      total_checked_in: parseInt(row.total_checked_in, 10),
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
    },
  };
};

const getEventAttendeeDetails = async (eventId, userId, userRole) => {
  const event = await findEventById(eventId);
  if (!event || event.is_deleted) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole !== 'admin_role') {
    if (event.created_by !== userId) {
      const ownsOrganization = await isOrganizationOwner(event.organization_id, userId);
      if (!ownsOrganization) {
        const error = new Error('You do not have permission to view attendees for this event');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  const [statsResult, attendeesResult] = await Promise.all([
    db.query(
      `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(er.is_deleted, false) = false AND er.status != 'CANCELLED' THEN 1 ELSE 0 END), 0) AS total_attendees,
        COALESCE(SUM(CASE WHEN COALESCE(er.is_deleted, false) = false AND er.status = 'CHECKED_IN' THEN 1 ELSE 0 END), 0) AS total_checked_in,
        COALESCE(SUM(CASE WHEN COALESCE(er.is_deleted, false) = false AND er.status = 'REGISTERED' THEN 1 ELSE 0 END), 0) AS total_not_checked_in
      FROM event_registrations er
      WHERE er.event_id = ?`,
      [eventId]
    ),
    db.query(
      `SELECT
        er.id AS registration_id,
        er.registered_at,
        er.status,
        u.id AS user_id,
        u.email,
        COALESCE(up.first_name, u.first_name) AS first_name,
        COALESCE(up.last_name, u.last_name) AS last_name,
        COALESCE(up.contact, NULL) AS contact
      FROM event_registrations er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN user_profile up ON up.user_id = u.id
      WHERE er.event_id = ? AND COALESCE(er.is_deleted, false) = false
      ORDER BY er.registered_at DESC`,
      [eventId]
    ),
  ]);

  const statsRow = statsResult.rows[0] || {};

  return {
    event: {
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
    },
    stats: {
      total_attendees: parseInt(statsRow.total_attendees || 0, 10),
      total_checked_in: parseInt(statsRow.total_checked_in || 0, 10),
      total_not_checked_in: parseInt(statsRow.total_not_checked_in || 0, 10),
    },
    attendees: attendeesResult.rows.map(row => ({
      registration_id: row.registration_id,
      user_id: row.user_id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null,
      email: row.email,
      contact: row.contact,
      registered_at: row.registered_at,
      status: row.status,
    })),
  };
};

module.exports = {
  getCreatedEventsWithAttendeeStats,
  getEventAttendeeDetails,
};

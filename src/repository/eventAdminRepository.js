const db = require('../config/db');

const getEventAdminStats = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total_events,
      COUNT(*) FILTER (WHERE e.start_time >= NOW())::int AS upcoming_events,
      COUNT(*) FILTER (WHERE e.start_time < NOW())::int AS past_events
    FROM events e
    WHERE (e.is_deleted = FALSE OR e.is_deleted IS NULL)
  `);
  const row = result.rows[0];
  return {
    total_events: parseInt(row.total_events, 10),
    status: {
      upcoming: parseInt(row.upcoming_events, 10),
      past: parseInt(row.past_events, 10),
    },
  };
};

const getAllEvents = async ({ search, status, category, organization_id, limit = 10, offset = 0 } = {}) => {
  const values = [];
  const conditions = ['(e.is_deleted = FALSE OR e.is_deleted IS NULL)'];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(e.title ILIKE $${values.length} OR e.short_description ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`e.status = $${values.length}`);
  }

  if (category) {
    values.push(category);
    conditions.push(`e.category = $${values.length}`);
  }

  if (organization_id) {
    values.push(organization_id);
    conditions.push(`e.organization_id = $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM events e ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get events with pagination
  values.push(limit);
  values.push(offset);

  const result = await db.query(
    `SELECT 
      e.id,
      e.organization_id,
      e.group_id,
      e.created_by,
      e.title,
      e.short_description,
      e.long_description,
      e.category,
      e.start_time,
      e.end_time,
      e.duration,
      e.capacity,
      e.location,
      e.full_address,
      e.status,
      e.is_public,
      e.created_at,
      e.updated_at,
      o.org_name as organization_name,
      g.name as group_name,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      COALESCE(regs.registered_count, 0) AS registered_count
    FROM events e
    LEFT JOIN organizations o ON e.organization_id = o.id
    LEFT JOIN groups g ON e.group_id = g.id
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS registered_count
      FROM event_registrations
      GROUP BY event_id
    ) regs ON regs.event_id = e.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return {
    events: result.rows,
    total,
    limit,
    offset,
  };
};

const getEventById = async (eventId) => {
  const result = await db.query(
    `SELECT 
      e.id,
      e.organization_id,
      e.group_id,
      e.created_by,
      e.title,
      e.short_description,
      e.long_description,
      e.category,
      e.start_time,
      e.end_time,
      e.duration,
      e.capacity,
      e.location,
      e.full_address,
      e.status,
      e.is_public,
      e.created_at,
      e.updated_at,
      o.org_name as organization_name,
      g.name as group_name,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      COALESCE(regs.registered_count, 0) AS registered_count
    FROM events e
    LEFT JOIN organizations o ON e.organization_id = o.id
    LEFT JOIN groups g ON e.group_id = g.id
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS registered_count
      FROM event_registrations
      GROUP BY event_id
    ) regs ON regs.event_id = e.id
    WHERE e.id = $1 AND (e.is_deleted = FALSE OR e.is_deleted IS NULL)`,
    [eventId]
  );
  return result.rows[0];
};

const updateEventStatus = async (eventId, status) => {
  const result = await db.query(
    `UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 AND (is_deleted = FALSE OR is_deleted IS NULL) RETURNING *`,
    [status, eventId]
  );
  return result.rows[0];
};

const deleteEvent = async (eventId) => {
  const result = await db.query(
    `UPDATE events SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [eventId]
  );
  return result.rows[0];
};

module.exports = {
  getEventAdminStats,
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
};

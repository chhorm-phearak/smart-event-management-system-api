const db = require('../config/db');

const getOrganizerById = async (organizerId) => {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.gender,
      u.status,
      u.role_id,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at,
      up.img_url,
      up.contact,
      up.address,
      up.date_of_birth,
      o.id as organization_id,
      o.org_name,
      o.org_type,
      o.email as org_email,
      o.contact as org_contact,
      o.description as org_description,
      o.status as org_status,
      o.created_at as org_created_at,
      -- Event statistics
      (SELECT COUNT(*)::int FROM events e WHERE e.created_by = u.id AND e.is_deleted = FALSE) as total_events,
      (SELECT COUNT(*)::int FROM events e WHERE e.created_by = u.id AND e.is_deleted = FALSE AND e.status = 'ACTIVE') as active_events,
      (SELECT COUNT(*)::int FROM events e WHERE e.created_by = u.id AND e.is_deleted = FALSE AND e.status = 'COMPLETED') as completed_events,
      -- Upcoming events
      (SELECT COUNT(*)::int FROM events e 
       WHERE e.created_by = u.id 
       AND e.is_deleted = FALSE 
       AND e.status = 'ACTIVE' 
       AND e.start_time > NOW()) as upcoming_events,
      -- Total attendees across all events
      (SELECT COUNT(*)::int 
       FROM event_registrations ea 
       JOIN events e ON ea.event_id = e.id 
       WHERE e.created_by = u.id 
       AND e.is_deleted = FALSE 
       AND ea.status = 'REGISTERED') as total_attendees,
      -- Recent events
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', e.id,
          'title', e.title,
          'description', e.short_description,
          'start_date', e.start_time,
          'end_date', e.end_time,
          'status', e.status,
          'location', e.location,
          'max_attendees', e.capacity,
          'current_attendees', (
            SELECT COUNT(*)::int 
            FROM event_registrations ea2 
            WHERE ea2.event_id = e.id AND ea2.status = 'REGISTERED'
          )
        ) ORDER BY e.created_at DESC
       ) 
       FROM (
         SELECT * FROM events 
         WHERE created_by = u.id 
         AND is_deleted = FALSE 
         ORDER BY created_at DESC 
         LIMIT 5
       ) e) as recent_events
    FROM organizations o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE o.id = $1 
    AND (o.is_deleted = FALSE OR o.is_deleted IS NULL)
    AND u.is_deleted = FALSE`,
    [organizerId]
  );
  
  return result.rows[0];
};

const getAllOrganizers = async ({ search, status, page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  const values = [];
  const conditions = ["o.id IS NOT NULL", "(o.is_deleted = FALSE OR o.is_deleted IS NULL)", "u.is_deleted = FALSE"];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR o.org_name ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`u.status = $${values.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total 
     FROM organizations o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN user_profile up ON u.id = up.user_id
     WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get organizers with pagination
  values.push(limit);
  values.push(offset);

  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.status,
      u.created_at,
      up.img_url,
      o.id as organization_id,
      o.org_name,
      o.status as org_status,
      (SELECT COUNT(*)::int FROM events e WHERE e.created_by = u.id AND e.is_deleted = FALSE) as total_events,
      (SELECT COUNT(*)::int 
       FROM event_registrations ea 
       JOIN events e ON ea.event_id = e.id 
       WHERE e.created_by = u.id 
       AND e.is_deleted = FALSE 
       AND ea.status = 'REGISTERED') as total_attendees
    FROM organizations o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profile up ON u.id = up.user_id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return {
    organizers: result.rows,
    total,
    limit,
    offset,
  };
};

module.exports = {
  getOrganizerById,
  getAllOrganizers,
};

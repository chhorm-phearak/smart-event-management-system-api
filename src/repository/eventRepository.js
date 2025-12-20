const db = require('../config/db');

const createEvent = async ({
  organization_id,
  group_id,
  title,
  description,
  location,
  start_time,
  end_time,
  is_public,
}) => {
  const result = await db.query(
    `INSERT INTO events (organization_id, group_id, title, description, location, start_time, end_time, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [organization_id, group_id || null, title, description || null, location || null, start_time, end_time, is_public !== undefined ? is_public : true]
  );
  return result.rows[0];
};

const findEventById = async (eventId) => {
  const result = await db.query(
    `SELECT e.*, o.name as organization_name
     FROM events e
     LEFT JOIN organizations o ON e.organization_id = o.id
     WHERE e.id = $1`,
    [eventId]
  );
  return result.rows[0];
};

const updateEvent = async (eventId, {
  organization_id,
  group_id,
  title,
  description,
  location,
  start_time,
  end_time,
  is_public,
}) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (organization_id !== undefined) {
    updates.push(`organization_id = $${paramCount++}`);
    values.push(organization_id);
  }
  if (group_id !== undefined) {
    updates.push(`group_id = $${paramCount++}`);
    values.push(group_id);
  }
  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (location !== undefined) {
    updates.push(`location = $${paramCount++}`);
    values.push(location);
  }
  if (start_time !== undefined) {
    updates.push(`start_time = $${paramCount++}`);
    values.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push(`end_time = $${paramCount++}`);
    values.push(end_time);
  }
  if (is_public !== undefined) {
    updates.push(`is_public = $${paramCount++}`);
    values.push(is_public);
  }

  if (updates.length === 0) {
    return await findEventById(eventId);
  }

  values.push(eventId);
  const query = `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const deleteEvent = async (eventId) => {
  // First delete related records (agenda, staff, registrations)
  await db.query('DELETE FROM event_agenda WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_staff WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_registrations WHERE event_id = $1', [eventId]);
  
  // Then delete the event
  const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);
  return result.rows[0];
};

const addEventAgenda = async (eventId, agendaItems) => {
  if (!agendaItems || agendaItems.length === 0) {
    return [];
  }

  const agendaResults = [];
  for (const item of agendaItems) {
    const result = await db.query(
      `INSERT INTO event_agenda (event_id, title, description, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [eventId, item.title, item.description || null, item.start_time || null, item.end_time || null]
    );
    agendaResults.push(result.rows[0]);
  }
  return agendaResults;
};

const addEventStaff = async (eventId, staffMembers) => {
  if (!staffMembers || staffMembers.length === 0) {
    return [];
  }

  const staffResults = [];
  for (const member of staffMembers) {
    const result = await db.query(
      `INSERT INTO event_staff (event_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [eventId, member.user_id, member.role]
    );
    staffResults.push(result.rows[0]);
  }
  return staffResults;
};

const getEventAgenda = async (eventId) => {
  const result = await db.query(
    'SELECT * FROM event_agenda WHERE event_id = $1 ORDER BY start_time',
    [eventId]
  );
  return result.rows;
};

const getEventStaff = async (eventId) => {
  const result = await db.query(
    `SELECT es.*, u.full_name, u.email
     FROM event_staff es
     LEFT JOIN users u ON es.user_id = u.id
     WHERE es.event_id = $1`,
    [eventId]
  );
  return result.rows;
};

const deleteEventAgenda = async (eventId) => {
  await db.query('DELETE FROM event_agenda WHERE event_id = $1', [eventId]);
};

const deleteEventStaff = async (eventId) => {
  await db.query('DELETE FROM event_staff WHERE event_id = $1', [eventId]);
};

const getAllEvents = async (organizationId, userId, userRole, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let countQuery;
  let dataQuery;
  let countParams;
  let dataParams;

  if (userRole === 'admin_role') {
    // Admins can see all events
    countQuery = `
      SELECT COUNT(*) as total
      FROM events e
    `;
    countParams = [];
    
    dataQuery = `
      SELECT e.*, o.name as organization_name, g.name as group_name
      FROM events e
      LEFT JOIN organizations o ON e.organization_id = o.id
      LEFT JOIN groups g ON e.group_id = g.id
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    dataParams = [limit, offset];
  } else {
    // Regular users can see events from their organizations or public events
    countQuery = `
      SELECT COUNT(*) as total
      FROM events e
      WHERE e.organization_id IN (
        SELECT id FROM organizations WHERE user_id = $1
      ) OR e.is_public = TRUE
    `;
    countParams = [userId];
    
    dataQuery = `
      SELECT e.*, o.name as organization_name, g.name as group_name
      FROM events e
      LEFT JOIN organizations o ON e.organization_id = o.id
      LEFT JOIN groups g ON e.group_id = g.id
      WHERE e.organization_id IN (
        SELECT id FROM organizations WHERE user_id = $1
      ) OR e.is_public = TRUE
      ORDER BY e.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    dataParams = [userId, limit, offset];
  }

  // Get total count
  const countResult = await db.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  // Get paginated events
  const eventsResult = await db.query(dataQuery, dataParams);
  const events = eventsResult.rows;

  // Fetch staff and agenda for each event
  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      const [agenda, staff] = await Promise.all([
        getEventAgenda(event.id),
        getEventStaff(event.id),
      ]);

      return {
        ...event,
        agenda,
        staff,
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

const getAllEventsByGroup = async (groupId, userId, userRole, page = 1, limit = 10) => {
  // First check if user has access to this group
  const groupCheck = await db.query(
    `SELECT g.*, o.user_id as org_owner_id
     FROM groups g
     LEFT JOIN organizations o ON g.organization_id = o.id
     WHERE g.id = $1`,
    [groupId]
  );

  if (groupCheck.rows.length === 0) {
    return null; // Group doesn't exist
  }

  const group = groupCheck.rows[0];

  // Check if user is admin, group owner, or group member
  if (userRole !== 'admin_role' && group.org_owner_id !== userId) {
    const isMember = await db.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (isMember.rows.length === 0) {
      return null; // User doesn't have access
    }
  }

  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total
     FROM events e
     WHERE e.group_id = $1`,
    [groupId]
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated events
  const eventsResult = await db.query(
    `SELECT e.*, o.name as organization_name, g.name as group_name
     FROM events e
     LEFT JOIN organizations o ON e.organization_id = o.id
     LEFT JOIN groups g ON e.group_id = g.id
     WHERE e.group_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );

  const events = eventsResult.rows;

  // Fetch staff and agenda for each event
  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      const [agenda, staff] = await Promise.all([
        getEventAgenda(event.id),
        getEventStaff(event.id),
      ]);

      return {
        ...event,
        agenda,
        staff,
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
  createEvent,
  findEventById,
  updateEvent,
  deleteEvent,
  addEventAgenda,
  addEventStaff,
  getEventAgenda,
  getEventStaff,
  deleteEventAgenda,
  deleteEventStaff,
  getAllEvents,
  getAllEventsByGroup,
};


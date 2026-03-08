const db = require('../config/db');
const crypto = require('crypto');

const createEvent = async ({
  organization_id,
  group_id,
  created_by,
  title,
  short_description,
  long_description,
  category,
  location,
  full_address,
  start_time,
  end_time,
  duration,
  capacity,
  status,
  is_public,
}) => {
  const result = await db.query(
    `INSERT INTO events (
      organization_id,
      group_id,
      created_by,
      title,
      short_description,
      long_description,
      category,
      start_time,
      end_time,
      duration,
      capacity,
      location,
      full_address,
      status,
      is_public
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      organization_id,
      group_id || null,
      created_by,
      title,
      short_description || null,
      long_description || null,
      category || null,
      start_time,
      end_time,
      duration || null,
      capacity || null,
      location || null,
      full_address || null,
      status || 'DRAFT',
      is_public !== undefined ? is_public : true,
    ]
  );
  return result.rows[0];
};

const findEventById = async (eventId) => {
  const result = await db.query(
    `SELECT
      e.*,
      o.org_name as organization_name,
      g.name as group_name
     FROM events e
     LEFT JOIN organizations o ON e.organization_id = o.id
     LEFT JOIN groups g ON e.group_id = g.id
     WHERE e.id = $1`,
    [eventId]
  );
  return result.rows[0];
};

const updateEvent = async (eventId, {
  organization_id,
  group_id,
  title,
  short_description,
  long_description,
  category,
  location,
  full_address,
  start_time,
  end_time,
  duration,
  capacity,
  status,
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
  if (short_description !== undefined) {
    updates.push(`short_description = $${paramCount++}`);
    values.push(short_description);
  }
  if (long_description !== undefined) {
    updates.push(`long_description = $${paramCount++}`);
    values.push(long_description);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    values.push(category);
  }
  if (location !== undefined) {
    updates.push(`location = $${paramCount++}`);
    values.push(location);
  }
  if (full_address !== undefined) {
    updates.push(`full_address = $${paramCount++}`);
    values.push(full_address);
  }
  if (start_time !== undefined) {
    updates.push(`start_time = $${paramCount++}`);
    values.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push(`end_time = $${paramCount++}`);
    values.push(end_time);
  }
  if (duration !== undefined) {
    updates.push(`duration = $${paramCount++}`);
    values.push(duration);
  }
  if (capacity !== undefined) {
    updates.push(`capacity = $${paramCount++}`);
    values.push(capacity);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }
  if (is_public !== undefined) {
    updates.push(`is_public = $${paramCount++}`);
    values.push(is_public);
  }

  if (updates.length === 0) {
    return await findEventById(eventId);
  }

  values.push(eventId);
  updates.push('updated_at = NOW()');
  const query = `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

const deleteEvent = async (eventId) => {
  // Delete attendance logs first because registrations are referenced here.
  await db.query(
    `DELETE FROM attendance_logs
     WHERE registration_id IN (SELECT id FROM event_registrations WHERE event_id = $1)`,
    [eventId]
  );
  await db.query('DELETE FROM event_agenda WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_staff WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_feedback WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM notifications WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_images WHERE event_id = $1', [eventId]);
  await db.query('DELETE FROM event_registrations WHERE event_id = $1', [eventId]);
  
  // Then delete the event
  const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);
  return result.rows[0];
};

const getAgendaDurationMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
};

const addEventAgenda = async (eventId, agendaItems) => {
  if (!agendaItems || agendaItems.length === 0) {
    return [];
  }

  const agendaResults = [];
  for (const item of agendaItems) {
    const duration = getAgendaDurationMinutes(item.start_time, item.end_time);
    const result = await db.query(
      `INSERT INTO event_agenda (event_id, title, description, start_time, end_time, duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, item.title, item.description || null, item.start_time || null, item.end_time || null, duration]
    );
    agendaResults.push(result.rows[0]);
  }
  return agendaResults;
};

const addEventStaff = async (eventId, staffMembers, organizationId) => {
  if (!staffMembers || staffMembers.length === 0) {
    return [];
  }
  if (!organizationId) {
    return [];
  }

  const staffResults = [];
  for (const member of staffMembers) {
    const userId = member.user_id;
    const role = member.role;
    if (!userId) continue;

    const orgMemberResult = await db.query(
      `SELECT id FROM organization_members 
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );

    let orgMemberId;
    if (orgMemberResult.rows.length === 0) {
      const createResult = await db.query(
        `INSERT INTO organization_members (organization_id, user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [organizationId, userId]
      );
      orgMemberId = createResult.rows[0].id;
    } else {
      orgMemberId = orgMemberResult.rows[0].id;
    }

    const result = await db.query(
      `INSERT INTO event_staff (event_id, organization_member_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, organization_member_id) DO UPDATE SET role = $3
       RETURNING *`,
      [eventId, orgMemberId, role]
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
    `SELECT es.*, 
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.email,
            om.organization_id
     FROM event_staff es
     LEFT JOIN organization_members om ON es.organization_member_id = om.id
     LEFT JOIN users u ON om.user_id = u.id
     WHERE es.event_id = $1 AND (u.is_deleted = FALSE OR u.is_deleted IS NULL)`,
    [eventId]
  );
  return result.rows;
};

const addEventImage = async (eventId, imageUrl, description = null) => {
  const result = await db.query(
    `INSERT INTO event_images (event_id, image_url, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [eventId, imageUrl, description]
  );
  return result.rows[0];
};

const getEventImages = async (eventId) => {
  const result = await db.query(
    'SELECT * FROM event_images WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return result.rows;
};

const findEventImageById = async (imageId) => {
  const result = await db.query(
    'SELECT * FROM event_images WHERE id = $1',
    [imageId]
  );
  return result.rows[0];
};

const deleteEventImage = async (imageId) => {
  const result = await db.query(
    'DELETE FROM event_images WHERE id = $1 RETURNING *',
    [imageId]
  );
  return result.rows[0];
};

const deleteEventAgenda = async (eventId) => {
  await db.query('DELETE FROM event_agenda WHERE event_id = $1', [eventId]);
};

const createAgendaItem = async (eventId, { title, description, start_time, end_time }) => {
  const duration = getAgendaDurationMinutes(start_time, end_time);
  const result = await db.query(
    `INSERT INTO event_agenda (event_id, title, description, start_time, end_time, duration)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [eventId, title || null, description || null, start_time || null, end_time || null, duration]
  );
  return result.rows[0];
};

const findAgendaItemById = async (agendaId) => {
  const result = await db.query(
    'SELECT * FROM event_agenda WHERE id = $1',
    [agendaId]
  );
  return result.rows[0];
};

const updateAgendaItem = async (agendaId, { title, description, start_time, end_time }) => {
  const updates = [];
  const values = [];
  let paramCount = 1;
  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (start_time !== undefined) {
    updates.push(`start_time = $${paramCount++}`);
    values.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push(`end_time = $${paramCount++}`);
    values.push(end_time);
  }
  if (updates.length === 0) {
    return await findAgendaItemById(agendaId);
  }
  if (start_time !== undefined || end_time !== undefined) {
    const existing = await findAgendaItemById(agendaId);
    const finalStart = start_time !== undefined ? start_time : existing.start_time;
    const finalEnd = end_time !== undefined ? end_time : existing.end_time;
    const duration = getAgendaDurationMinutes(finalStart, finalEnd);
    updates.push(`duration = $${paramCount++}`);
    values.push(duration);
  }
  updates.push('updated_at = NOW()');
  values.push(agendaId);
  const result = await db.query(
    `UPDATE event_agenda SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteAgendaItem = async (agendaId) => {
  const result = await db.query(
    'DELETE FROM event_agenda WHERE id = $1 RETURNING *',
    [agendaId]
  );
  return result.rows[0];
};

const deleteEventStaff = async (eventId) => {
  await db.query('DELETE FROM event_staff WHERE event_id = $1', [eventId]);
};

const createEventStaffMember = async (eventId, { organization_id, user_id, role }) => {
  let orgMemberResult = await db.query(
    'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
    [organization_id, user_id]
  );
  let orgMemberId;
  if (orgMemberResult.rows.length === 0) {
    const createResult = await db.query(
      `INSERT INTO organization_members (organization_id, user_id)
       VALUES ($1, $2)
       RETURNING id`,
      [organization_id, user_id]
    );
    orgMemberId = createResult.rows[0].id;
  } else {
    orgMemberId = orgMemberResult.rows[0].id;
  }
  const result = await db.query(
    `INSERT INTO event_staff (event_id, organization_member_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, organization_member_id) DO UPDATE SET role = $3
     RETURNING *`,
    [eventId, orgMemberId, role || null]
  );
  return result.rows[0];
};

const findEventStaffById = async (staffId) => {
  const result = await db.query(
    `SELECT es.*, om.organization_id, om.user_id
     FROM event_staff es
     LEFT JOIN organization_members om ON es.organization_member_id = om.id
     WHERE es.id = $1`,
    [staffId]
  );
  return result.rows[0];
};

const updateEventStaffMember = async (staffId, { role }) => {
  if (role === undefined) {
    return await findEventStaffById(staffId);
  }
  const result = await db.query(
    'UPDATE event_staff SET role = $1 WHERE id = $2 RETURNING *',
    [role, staffId]
  );
  return result.rows[0];
};

const deleteEventStaffMember = async (staffId) => {
  const result = await db.query(
    'DELETE FROM event_staff WHERE id = $1 RETURNING *',
    [staffId]
  );
  return result.rows[0];
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
      SELECT e.*, o.org_name as organization_name, g.name as group_name
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
      SELECT e.*, o.org_name as organization_name, g.name as group_name
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

  // Get current user's registration qr_codes for these events (if any)
  let registrationMap = {};
  if (events.length > 0 && userId) {
    const eventIds = events.map((e) => e.id);
    const regResult = await db.query(
      `SELECT event_id, qr_code FROM event_registrations WHERE user_id = $1 AND event_id = ANY($2::uuid[])`,
      [userId, eventIds]
    );
    regResult.rows.forEach((row) => {
      registrationMap[row.event_id] = row.qr_code;
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

      const qrcode = registrationMap[event.id] ?? '';

      return {
        ...event,
        agenda,
        staff,
        images,
        qrcode,
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

const getAllRegisteredEvents = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    `SELECT COUNT(*) as total
     FROM event_registrations er
     WHERE er.user_id = $1`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].total);

  const eventsResult = await db.query(
    `SELECT
      e.*,
      o.org_name as organization_name,
      g.name as group_name,
      er.qr_code
     FROM event_registrations er
     INNER JOIN events e ON er.event_id = e.id
     LEFT JOIN organizations o ON e.organization_id = o.id
     LEFT JOIN groups g ON e.group_id = g.id
     WHERE er.user_id = $1
     ORDER BY er.registered_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const events = eventsResult.rows;

  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      const { qr_code, ...eventData } = event;
      const [agenda, staff, images] = await Promise.all([
        getEventAgenda(event.id),
        getEventStaff(event.id),
        getEventImages(event.id),
      ]);

      return {
        ...eventData,
        agenda,
        staff,
        images,
        qrcode: qr_code || '',
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
    `SELECT e.*, o.org_name as organization_name, g.name as group_name
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
      const [agenda, staff, images] = await Promise.all([
        getEventAgenda(event.id),
        getEventStaff(event.id),
        getEventImages(event.id),
      ]);

      return {
        ...event,
        agenda,
        staff,
        images,
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

// --- Event registration (register for event, unique qr_code generated) ---
const findRegistrationByEventAndUser = async (eventId, userId) => {
  const result = await db.query(
    `SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  return result.rows[0];
};

const createEventRegistration = async (eventId, userId) => {
  const qrCode = crypto.randomBytes(24).toString('base64url');
  const result = await db.query(
    `INSERT INTO event_registrations (event_id, user_id, qr_code)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [eventId, userId, qrCode]
  );
  return result.rows[0];
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
  createAgendaItem,
  findAgendaItemById,
  updateAgendaItem,
  deleteAgendaItem,
  createEventStaffMember,
  findEventStaffById,
  updateEventStaffMember,
  deleteEventStaffMember,
  addEventImage,
  getEventImages,
  findEventImageById,
  deleteEventImage,
  deleteEventAgenda,
  deleteEventStaff,
  getAllEvents,
  getAllRegisteredEvents,
  getAllEventsByGroup,
  findRegistrationByEventAndUser,
  createEventRegistration,
};


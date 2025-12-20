const {
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
} = require('../repository/eventRepository');
const {
  findOrganizationById,
  findOrganizationByUserId,
  isOrganizationOwner,
} = require('../repository/organizationRepository');
const { findGroupById, isGroupMember } = require('../repository/groupRepository');

const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const {
      organization_id,
      group_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_public,
      agenda,
      staff,
    } = req.body;

    // Validate required fields
    if (!organization_id || !title || !start_time || !end_time) {
      return res.status(400).json({
        message: 'organization_id, title, start_time, and end_time are required',
      });
    }

    // Check if user has an organization (unless admin)
    if (userRole !== 'admin_role') {
      const userOrganizations = await findOrganizationByUserId(userId);
      if (!userOrganizations || userOrganizations.length === 0) {
        return res.status(403).json({
          message: 'You must have an organization to create events',
        });
      }
    }

    // Check if organization exists
    const organization = await findOrganizationById(organization_id);
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found',
      });
    }

    // Check if user owns the organization (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to create events for this organization',
        });
      }
    }

    // If group_id is provided, validate group access
    if (group_id) {
      const group = await findGroupById(group_id);
      if (!group) {
        return res.status(404).json({
          message: 'Group not found',
        });
      }

      // Check if group belongs to the organization
      if (group.organization_id !== organization_id) {
        return res.status(400).json({
          message: 'Group does not belong to the specified organization',
        });
      }

      // Check if user is a member of the group (unless admin or owner)
      if (userRole !== 'admin_role' && group.org_owner_id !== userId) {
        const isMember = await isGroupMember(group_id, userId);
        if (!isMember) {
          return res.status(403).json({
            message: 'You must be a member of the group to create events within it',
          });
        }
      }
    }

    // Validate time logic
    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({
        message: 'end_time must be after start_time',
      });
    }

    // Create the event
    const event = await createEvent({
      organization_id,
      group_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_public,
    });

    // Add agenda items if provided
    let agendaItems = [];
    if (agenda && Array.isArray(agenda) && agenda.length > 0) {
      agendaItems = await addEventAgenda(event.id, agenda);
    }

    // Add staff members if provided
    let staffMembers = [];
    if (staff && Array.isArray(staff) && staff.length > 0) {
      staffMembers = await addEventStaff(event.id, staff);
    }

    return res.status(201).json({
      message: 'Event created successfully',
      data: {
        event,
        agenda: agendaItems,
        staff: staffMembers,
      },
    });
  } catch (err) {
    console.error('Error creating event:', err);
    
    // Handle foreign key constraint violations
    if (err.code === '23503') {
      if (err.constraint === 'fk_event_org') {
        return res.status(400).json({
          message: 'Invalid organization_id. Organization does not exist.',
        });
      }
      if (err.constraint === 'fk_event_group') {
        return res.status(400).json({
          message: 'Invalid group_id. Group does not exist.',
        });
      }
      if (err.constraint === 'fk_event_staff_user') {
        return res.status(400).json({
          message: 'Invalid user_id in staff assignment. User does not exist.',
        });
      }
      return res.status(400).json({
        message: 'Foreign key constraint violation. Please check your input data.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const {
      organization_id,
      group_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_public,
      agenda,
      staff,
    } = req.body;

    // Check if event exists
    const existingEvent = await findEventById(id);
    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns the organization of this event (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(existingEvent.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to update this event',
        });
      }
    }

    // If organization_id is being updated, validate it
    if (organization_id !== undefined) {
      // Check if user has an organization (unless admin)
      if (userRole !== 'admin_role') {
        const userOrganizations = await findOrganizationByUserId(userId);
        if (!userOrganizations || userOrganizations.length === 0) {
          return res.status(403).json({
            message: 'You must have an organization to update events',
          });
        }
      }

      // Check if new organization exists
      const organization = await findOrganizationById(organization_id);
      if (!organization) {
        return res.status(404).json({
          message: 'Organization not found',
        });
      }

      // Check if user owns the new organization (unless admin)
      if (userRole !== 'admin_role') {
        const isOwner = await isOrganizationOwner(organization_id, userId);
        if (!isOwner) {
          return res.status(403).json({
            message: 'You do not have permission to move events to this organization',
          });
        }
      }
    }

    // Validate time logic if both times are provided
    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({
        message: 'end_time must be after start_time',
      });
    }

    // Update the event
    const updatedEvent = await updateEvent(id, {
      organization_id,
      group_id,
      title,
      description,
      location,
      start_time,
      end_time,
      is_public,
    });

    // Update agenda if provided
    let agendaItems = [];
    if (agenda !== undefined) {
      if (Array.isArray(agenda)) {
        // Delete existing agenda and add new ones
        await deleteEventAgenda(id);
        if (agenda.length > 0) {
          agendaItems = await addEventAgenda(id, agenda);
        }
      }
    } else {
      // If agenda not provided, return existing agenda
      agendaItems = await getEventAgenda(id);
    }

    // Update staff if provided
    let staffMembers = [];
    if (staff !== undefined) {
      if (Array.isArray(staff)) {
        // Delete existing staff and add new ones
        await deleteEventStaff(id);
        if (staff.length > 0) {
          staffMembers = await addEventStaff(id, staff);
        }
      }
    } else {
      // If staff not provided, return existing staff
      staffMembers = await getEventStaff(id);
    }

    return res.json({
      message: 'Event updated successfully',
      data: {
        event: updatedEvent,
        agenda: agendaItems,
        staff: staffMembers,
      },
    });
  } catch (err) {
    console.error('Error updating event:', err);
    
    // Handle foreign key constraint violations
    if (err.code === '23503') {
      if (err.constraint === 'fk_event_org') {
        return res.status(400).json({
          message: 'Invalid organization_id. Organization does not exist.',
        });
      }
      if (err.constraint === 'fk_event_group') {
        return res.status(400).json({
          message: 'Invalid group_id. Group does not exist.',
        });
      }
      if (err.constraint === 'fk_event_staff_user') {
        return res.status(400).json({
          message: 'Invalid user_id in staff assignment. User does not exist.',
        });
      }
      return res.status(400).json({
        message: 'Foreign key constraint violation. Please check your input data.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns the organization of this event (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to delete this event',
        });
      }
    }

    await deleteEvent(id);

    return res.json({
      message: 'Event deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    
    // Handle foreign key constraint violations
    if (err.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete event due to foreign key constraints.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns the organization of this event (unless admin or event is public)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner && !event.is_public) {
        return res.status(403).json({
          message: 'You do not have permission to view this event',
        });
      }
    }

    const agenda = await getEventAgenda(id);
    const staff = await getEventStaff(id);

    return res.json({
      message: 'Event retrieved successfully',
      data: {
        event,
        agenda,
        staff,
      },
    });
  } catch (err) {
    console.error('Error retrieving event:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination parameters
    if (page < 1) {
      return res.status(400).json({
        message: 'Page must be greater than 0',
      });
    }
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        message: 'Limit must be between 1 and 100',
      });
    }

    const result = await getAllEvents(null, userId, userRole, page, limit);

    return res.json({
      message: 'Events retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error retrieving events:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllByGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { group_id } = req.params;
    
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination parameters
    if (page < 1) {
      return res.status(400).json({
        message: 'Page must be greater than 0',
      });
    }
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        message: 'Limit must be between 1 and 100',
      });
    }

    const result = await getAllEventsByGroup(group_id, userId, userRole, page, limit);

    if (result === null) {
      return res.status(403).json({
        message: 'You do not have permission to view events for this group',
      });
    }

    return res.json({
      message: 'Group events retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error retrieving group events:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  create,
  update,
  remove,
  getById,
  getAll,
  getAllByGroup,
};


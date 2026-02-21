const {
  findEventById,
  getEventAgenda,
  createAgendaItem,
  findAgendaItemById,
  updateAgendaItem,
  deleteAgendaItem,
} = require('../repository/eventRepository');
const { isOrganizationOwner } = require('../repository/organizationRepository');

const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner && !event.is_public) {
        return res.status(403).json({ message: 'You do not have permission to view this event' });
      }
    }
    const agenda = await getEventAgenda(id);
    return res.json({ message: 'Agenda retrieved successfully', data: agenda });
  } catch (err) {
    console.error('Error retrieving agenda:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, agendaId } = req.params;
    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner && !event.is_public) {
        return res.status(403).json({ message: 'You do not have permission to view this event' });
      }
    }
    const item = await findAgendaItemById(agendaId);
    if (!item || item.event_id !== id) {
      return res.status(404).json({ message: 'Agenda item not found' });
    }
    return res.json({ message: 'Agenda item retrieved successfully', data: item });
  } catch (err) {
    console.error('Error retrieving agenda item:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const { title, description, start_time, end_time } = req.body;
    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to manage this event' });
      }
    }
    const item = await createAgendaItem(id, { title, description, start_time, end_time });
    return res.status(201).json({ message: 'Agenda item created successfully', data: item });
  } catch (err) {
    console.error('Error creating agenda item:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, agendaId } = req.params;
    const { title, description, start_time, end_time } = req.body;
    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to manage this event' });
      }
    }
    const existing = await findAgendaItemById(agendaId);
    if (!existing || existing.event_id !== id) {
      return res.status(404).json({ message: 'Agenda item not found' });
    }
    const item = await updateAgendaItem(agendaId, { title, description, start_time, end_time });
    return res.json({ message: 'Agenda item updated successfully', data: item });
  } catch (err) {
    console.error('Error updating agenda item:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, agendaId } = req.params;
    const event = await findEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(event.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to manage this event' });
      }
    }
    const existing = await findAgendaItemById(agendaId);
    if (!existing || existing.event_id !== id) {
      return res.status(404).json({ message: 'Agenda item not found' });
    }
    await deleteAgendaItem(agendaId);
    return res.json({ message: 'Agenda item deleted successfully' });
  } catch (err) {
    console.error('Error deleting agenda item:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

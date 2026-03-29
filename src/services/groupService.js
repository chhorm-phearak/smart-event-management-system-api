const {
  findGroupById,
  getGroupMembers,
  isGroupMember,
} = require('../repository/groupRepository');
const { getAllEventsByGroup } = require('../repository/eventRepository');
const { getFullUrl } = require('./uploadService');

const getGroupDetails = async (groupId, userId, userRole) => {
  // Get basic group info
  const group = await findGroupById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  // Check if user has access (admin, group creator, or member)
  if (userRole !== 'admin_role' && group.created_by !== userId) {
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You do not have permission to view this group');
    }
  }

  // Get group members with user details
  const members = await getGroupMembers(groupId);

  // Get all events in the group (using high limit to get all events)
  const eventsResult = await getAllEventsByGroup(groupId, userId, userRole, 1, 1000);
  const events = eventsResult ? eventsResult.events : [];

  // Get member count
  const memberCount = members.length;

  // Get event count
  const eventCount = events.length;

  return {
    group: {
      ...group,
      image_url: group.image_url ? getFullUrl(group.image_url) : null,
      member_count: memberCount,
      event_count: eventCount,
    },
    members: members.map(member => ({
      id: member.user_id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      contact: member.contact,
      joined_at: member.joined_at,
      role: member.role,
    })),
    events: events.map(event => ({
      id: event.id,
      title: event.title,
      short_description: event.short_description,
      long_description: event.long_description,
      category: event.category,
      start_time: event.start_time,
      end_time: event.end_time,
      duration: event.duration,
      location: event.location,
      full_address: event.full_address,
      capacity: event.capacity,
      status: event.status,
      is_public: event.is_public,
      organization_name: event.organization_name,
      group_name: event.group_name,
      created_at: event.created_at,
      updated_at: event.updated_at,
      agenda: event.agenda || [],
      staff: event.staff || [],
      images: event.images || [],
    })),
  };
};

const getGroupStats = async (groupId, userId, userRole) => {
  const group = await findGroupById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  // Check if user has access (admin, group creator, or member)
  if (userRole !== 'admin_role' && group.created_by !== userId) {
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You do not have permission to view this group');
    }
  }

  const members = await getGroupMembers(groupId);
  const eventsResult = await getAllEventsByGroup(groupId, userId, userRole, 1, 1000);
  const events = eventsResult ? eventsResult.events : [];

  return {
    group_id: groupId,
    member_count: members.length,
    event_count: events.length,
    created_at: group.created_at,
    updated_at: group.updated_at,
  };
};

module.exports = {
  getGroupDetails,
  getGroupStats,
};

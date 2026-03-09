const inviteLinkRepository = require('../repository/inviteLinkRepository');
const { findGroupById, addGroupMember, isGroupMember } = require('../repository/groupRepository');
const { findOrganizationById, isOrganizationOwner } = require('../repository/organizationRepository');
const notificationService = require('./notificationService');
const { findById } = require('../repository/userRepository');
const db = require('../config/db');

/**
 * Check if an organization owns a group
 */
const isOrganizationOwnerOfGroup = async (organizationId, groupId) => {
  const group = await findGroupById(groupId);
  if (!group) {
    return false;
  }
  return group.organization_id === organizationId;
};

/**
 * Create a new invite link for a group
 */
const createInviteLink = async ({ group_id, created_by, expires_at, max_uses, message }) => {
  if (!group_id || !created_by) {
    throw new Error('group_id and created_by are required');
  }

  // Verify group exists and user has permission
  const group = await findGroupById(group_id);
  if (!group) {
    throw new Error('Group not found');
  }

  // Check if organization owns the group
  const isOwner = await isOrganizationOwnerOfGroup(created_by, group_id);
  if (!isOwner) {
    throw new Error('You do not have permission to create invite links for this group');
  }

  // Set default expiration if not provided (7 days)
  if (!expires_at) {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    expires_at = defaultExpiration;
  }

  const inviteLink = await inviteLinkRepository.create({
    group_id,
    created_by,
    expires_at,
    max_uses: max_uses || 1,
    message
  });

  return inviteLink;
};

/**
 * Validate an invite link token and return group info
 */
const validateInviteLink = async (token) => {
  const validation = await inviteLinkRepository.isValidToken(token);
  
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const { inviteLink } = validation;
  
  // Return group info for preview page
  return {
    inviteLink: {
      id: inviteLink.id,
      token: inviteLink.token,
      expires_at: inviteLink.expires_at,
      max_uses: inviteLink.max_uses,
      current_uses: inviteLink.current_uses,
      message: inviteLink.message,
      created_at: inviteLink.created_at
    },
    group: {
      id: inviteLink.group_id,
      name: inviteLink.group_name,
      description: inviteLink.group_description,
      organization_name: inviteLink.organization_name
    },
    creator: {
      first_name: inviteLink.creator_first_name,
      last_name: inviteLink.creator_last_name,
      email: inviteLink.creator_email
    }
  };
};

/**
 * Accept an invite link and join the group
 */
const acceptInviteLink = async (token, userId) => {
  // Validate token first
  const validation = await inviteLinkRepository.isValidToken(token);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const { inviteLink } = validation;
  const groupId = inviteLink.group_id;

  // Check if user is already a member
  const isAlreadyMember = await isGroupMember(groupId, userId);
  if (isAlreadyMember) {
    throw new Error('You are already a member of this group');
  }

  // Add user to group
  const member = await addGroupMember(groupId, userId);
  
  // Update usage count
  await inviteLinkRepository.updateUsage(token);

  // Get user and group info for notifications
  const user = await findById(userId);
  const group = await findGroupById(groupId);
  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'A user';

  // Notify group creator that someone joined via invite link
  const organization = await findOrganizationById(inviteLink.created_by);
  if (!organization) {
    console.error('Organization not found for notification');
  } else {
    await notificationService.createNotification({
      user_id: organization.user_id, // The actual user who owns organization
      type: 'GROUP_MEMBER_JOINED_VIA_LINK',
      title: 'New member joined via invite link',
      message: `${userName} joined your group "${group.name}" using an invite link.`,
      group_id: groupId,
      actor_user_id: userId, // The user who joined
      data: { 
        invite_link_id: inviteLink.id,
        user_id: userId,
        group_id: groupId 
      }
    });
  }

  // Welcome notification to new member
  await notificationService.createNotification({
    user_id: userId, // The user who joined
    type: 'GROUP_WELCOME',
    title: 'Welcome to group!',
    message: `You have successfully joined "${group.name}".`,
    group_id: groupId,
    actor_user_id: organization?.user_id || null, // The organization owner who created the invite
    data: { 
      group_id: groupId,
      joined_via: 'invite_link'
    }
  });

  return {
    member,
    group: {
      id: group.id,
      name: group.name,
      description: group.description
    }
  };
};

/**
 * Get all invite links for a group
 */
const getGroupInviteLinks = async (groupId, organizationId, options = {}) => {
  // Verify group exists and organization has permission
  const group = await findGroupById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  // Check if organization owns the group
  const isOwner = await isOrganizationOwnerOfGroup(organizationId, group_id);
  if (!isOwner) {
    throw new Error('You do not have permission to view invite links for this group');
  }

  return await inviteLinkRepository.findByGroupId(groupId, options);
};

/**
 * Update an invite link
 */
const updateInviteLink = async (linkId, organizationId, updates) => {
  const inviteLink = await inviteLinkRepository.findById(linkId);
  if (!inviteLink) {
    throw new Error('Invite link not found');
  }

  // Check permissions
  const group = await findGroupById(inviteLink.group_id);
  const isOwner = await isOrganizationOwnerOfGroup(organizationId, group.group_id);
  if (!isOwner) {
    throw new Error('You do not have permission to update this invite link');
  }

  return await inviteLinkRepository.update(linkId, updates);
};

/**
 * Delete/disable an invite link
 */
const deleteInviteLink = async (linkId, organizationId) => {
  const inviteLink = await inviteLinkRepository.findById(linkId);
  if (!inviteLink) {
    throw new Error('Invite link not found');
  }

  // Check permissions
  const group = await findGroupById(inviteLink.group_id);
  const isOwner = await isOrganizationOwnerOfGroup(organizationId, group.group_id);
  if (!isOwner) {
    throw new Error('You do not have permission to delete this invite link');
  }

  return await inviteLinkRepository.remove(linkId);
};

/**
 * Get invite link information with specific response format
 */
const getInviteLinkInfo = async (token) => {
  const validation = await inviteLinkRepository.isValidToken(token);
  
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const { inviteLink } = validation;
  
  return {
    invite_link: inviteLink.token,
    expired_date: inviteLink.expires_at,
    number_of_uses: inviteLink.current_uses,
    max_uses: inviteLink.max_uses,
    message: inviteLink.message
  };
};

/**
 * Get latest invite link information for all groups in an organization
 */
const getOrganizationLatestInviteLinks = async (organizationId) => {
  // Get all groups for the organization
  const groupsResult = await db.query(
    `SELECT id, name, description 
     FROM groups 
     WHERE organization_id = $1`,
    [organizationId]
  );

  const groups = groupsResult.rows;
  const latestLinks = [];

  for (const group of groups) {
    // Get the latest invite link for this group
    const linkResult = await db.query(
      `SELECT il.token, il.expires_at, il.current_uses, il.max_uses, il.message, il.created_at
       FROM invite_links il
       WHERE il.group_id = $1
       ORDER BY il.created_at DESC
       LIMIT 1`,
      [group.id]
    );

    if (linkResult.rows.length > 0) {
      const link = linkResult.rows[0];
      latestLinks.push({
        group_id: group.id,
        group_name: group.name,
        group_description: group.description,
        invite_link: link.token,
        expired_date: link.expires_at,
        number_of_uses: link.current_uses,
        max_uses: link.max_uses,
        message: link.message,
        created_at: link.created_at
      });
    }
  }

  return latestLinks;
};

/**
 * Generate full invite URL for frontend
 */
const generateInviteUrl = (token, baseUrl) => {
  return `${baseUrl}/invite/accept/${token}`;
};

module.exports = {
  createInviteLink,
  validateInviteLink,
  acceptInviteLink,
  getGroupInviteLinks,
  updateInviteLink,
  deleteInviteLink,
  getInviteLinkInfo,
  getOrganizationLatestInviteLinks,
  generateInviteUrl
};

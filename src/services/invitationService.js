const invitationRepository = require('../repository/invitationRepository');
const notificationService = require('./notificationService');
const { findOrganizationById, addOrganizationMember } = require('../repository/organizationRepository');
const { findGroupById, addGroupMember } = require('../repository/groupRepository');
const { findById } = require('../repository/userRepository');

/**
 * Send an invite to an organization or group. Creates invitation + notification.
 */
const sendInvite = async (payload) => {
  const { target_type, organization_id, group_id, invited_user_id, invited_email, invited_by, role, message } = payload;
  if (!target_type || !invited_by) {
    throw new Error('target_type and invited_by are required');
  }
  if (!invited_user_id && !invited_email) {
    throw new Error('Either invited_user_id or invited_email is required');
  }
  if (target_type === 'ORGANIZATION' && !organization_id) {
    throw new Error('organization_id is required for ORGANIZATION invite');
  }
  if (target_type === 'GROUP' && !group_id) {
    throw new Error('group_id is required for GROUP invite');
  }

  const invitation = await invitationRepository.create({
    target_type,
    organization_id: target_type === 'ORGANIZATION' ? organization_id : null,
    group_id: target_type === 'GROUP' ? group_id : null,
    invited_user_id: invited_user_id || null,
    invited_email: invited_email || null,
    invited_by,
    role: role || null,
    message: message || null,
  });

  // Notify the invited user only if they have an account (invited_user_id)
  if (invited_user_id) {
    const inviter = await findById(invited_by);
    const inviterName = [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') || inviter?.email || 'Someone';
    const targetName = target_type === 'ORGANIZATION'
      ? (await findOrganizationById(organization_id))?.org_name
      : (await findGroupById(group_id))?.name;
    await notificationService.createNotification({
      user_id: invited_user_id,
      type: target_type === 'ORGANIZATION' ? 'ORG_INVITE_RECEIVED' : 'GROUP_INVITE_RECEIVED',
      title: `Invitation to ${target_type === 'ORGANIZATION' ? 'organization' : 'group'}`,
      message: `${inviterName} invited you to ${targetName}.`,
      organization_id: target_type === 'ORGANIZATION' ? organization_id : null,
      group_id: target_type === 'GROUP' ? group_id : null,
      invitation_id: invitation.id,
      actor_user_id: invited_by,
      data: { invitation_id: invitation.id, target_type, target_name: targetName },
    });
  }

  return invitation;
};

/**
 * Invite a user to a group by user id.
 * Only the group organizer (creator) can invite.
 */
const inviteUserToGroupById = async ({ group_id, user_id, invited_by, role, message }) => {
  if (!group_id || !user_id || !invited_by) {
    throw new Error('group_id, user_id and invited_by are required');
  }

  const group = await findGroupById(group_id);
  if (!group) {
    throw new Error('Group not found');
  }

  // Organizer permission check: only group creator
  if (group.created_by !== invited_by) {
    throw new Error('You do not have permission to invite to this group');
  }

  const invitation = await sendInvite({
    target_type: 'GROUP',
    group_id,
    invited_user_id: user_id,
    invited_email: null,
    invited_by,
    role: role || null,
    message: message || null,
  });

  return invitation;
};

/**
 * Accept an invitation (only PENDING, only by the invited user). Adds membership and notifies inviter.
 */
const acceptInvite = async (invitationId, userId) => {
  const invitation = await invitationRepository.findById(invitationId);
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status !== 'PENDING') throw new Error('Invitation is no longer pending');
  if (invitation.invited_user_id !== userId) throw new Error('You can only accept invitations sent to you');

  const updated = await invitationRepository.updateStatus(invitationId, 'ACCEPTED', userId);
  if (!updated) throw new Error('Failed to update invitation');

  if (invitation.target_type === 'ORGANIZATION') {
    await addOrganizationMember(invitation.organization_id, userId);
  } else {
    await addGroupMember(invitation.group_id, userId);
  }

  // Notify inviter
  const inviterId = invitation.invited_by;
  const targetName = invitation.organization_name || invitation.group_name;
  const invitedUser = await findById(userId);
  const invitedName = [invitedUser?.first_name, invitedUser?.last_name].filter(Boolean).join(' ') || invitedUser?.email || 'A user';
  await notificationService.createNotification({
    user_id: inviterId,
    type: invitation.target_type === 'ORGANIZATION' ? 'ORG_INVITE_ACCEPTED' : 'GROUP_INVITE_ACCEPTED',
    title: 'Invitation accepted',
    message: `${invitedName} accepted your invitation to ${targetName}.`,
    organization_id: invitation.organization_id || null,
    group_id: invitation.group_id || null,
    invitation_id: invitationId,
    actor_user_id: userId,
    data: { invitation_id: invitationId, target_type: invitation.target_type },
  });

  return updated;
};

/**
 * Reject an invitation (only PENDING, only by the invited user).
 */
const rejectInvite = async (invitationId, userId) => {
  const invitation = await invitationRepository.findById(invitationId);
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status !== 'PENDING') throw new Error('Invitation is no longer pending');
  if (invitation.invited_user_id !== userId) throw new Error('You can only reject invitations sent to you');

  const updated = await invitationRepository.updateStatus(invitationId, 'REJECTED', userId);
  if (!updated) throw new Error('Failed to update invitation');
  return updated;
};

/**
 * Cancel an invitation (only PENDING). Only the inviter or org/group owner should cancel.
 */
const cancelInvite = async (invitationId, userId) => {
  const invitation = await invitationRepository.findById(invitationId);
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status !== 'PENDING') throw new Error('Only pending invitations can be cancelled');
  if (invitation.invited_by !== userId) {
    // Optionally allow org owner or group owner to cancel; for simplicity we only allow inviter
    throw new Error('Only the inviter can cancel this invitation');
  }

  const updated = await invitationRepository.updateStatus(invitationId, 'CANCELLED', userId, { byInviter: true });
  if (!updated) throw new Error('Failed to update invitation');
  return updated;
};

/**
 * Get invitations received by the user (paginated).
 */
const getReceivedInvitations = async (userId, options = {}) => {
  return invitationRepository.getReceivedByUserId(userId, options);
};

/**
 * Get invitations sent by the user (paginated).
 */
const getSentInvitations = async (userId, options = {}) => {
  return invitationRepository.getSentByUserId(userId, options);
};

/**
 * Get one invitation by id; ensure user is recipient or sender.
 */
const getInvitationById = async (id, userId) => {
  const invitation = await invitationRepository.findById(id);
  if (!invitation) return null;
  if (invitation.invited_user_id !== userId && invitation.invited_by !== userId) return null;
  return invitation;
};

module.exports = {
  sendInvite,
  inviteUserToGroupById,
  acceptInvite,
  rejectInvite,
  cancelInvite,
  getReceivedInvitations,
  getSentInvitations,
  getInvitationById,
};

const invitationService = require('../services/invitationService');
const { isOrganizationOwner } = require('../repository/organizationRepository');
const { findGroupById } = require('../repository/groupRepository');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sendInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { target_type, organization_id, group_id, invited_user_id, invited_email, role, message } = req.body;

    if (!target_type || (!invited_user_id && !invited_email)) {
      return res.status(400).json({
        message: 'target_type and either invited_user_id or invited_email are required',
      });
    }
    if (target_type !== 'ORGANIZATION' && target_type !== 'GROUP') {
      return res.status(400).json({ message: 'target_type must be ORGANIZATION or GROUP' });
    }
    if (target_type === 'ORGANIZATION' && !organization_id) {
      return res.status(400).json({ message: 'organization_id is required for ORGANIZATION invite' });
    }
    if (target_type === 'GROUP' && !group_id) {
      return res.status(400).json({ message: 'group_id is required for GROUP invite' });
    }
    if (invited_user_id && !UUID_REGEX.test(invited_user_id)) {
      return res.status(400).json({ message: 'Invalid invited_user_id' });
    }

    if (target_type === 'ORGANIZATION') {
      if (userRole !== 'admin_role') {
        const isOwner = await isOrganizationOwner(organization_id, userId);
        if (!isOwner) {
          return res.status(403).json({ message: 'You do not have permission to invite to this organization' });
        }
      }
    } else {
      const group = await findGroupById(group_id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      // Only group organizer (creator) can invite to the group
      if (group.created_by !== userId) {
        return res.status(403).json({ message: 'You do not have permission to invite to this group' });
      }
    }

    const invitation = await invitationService.sendInvite({
      target_type,
      organization_id: target_type === 'ORGANIZATION' ? organization_id : null,
      group_id: target_type === 'GROUP' ? group_id : null,
      invited_user_id: invited_user_id || null,
      invited_email: invited_email || null,
      invited_by: userId,
      role: role || null,
      message: message || null,
    });

    return res.status(201).json({
      message: 'Invitation sent successfully',
      data: { invitation },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A pending invitation already exists for this user or email' });
    }
    console.error('Error sending invitation:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

const inviteToGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { group_id, user_id, role, message } = req.body;

    if (!group_id || !user_id) {
      return res.status(400).json({
        message: 'group_id and user_id are required',
      });
    }

    const invitation = await invitationService.inviteUserToGroupById({
      group_id,
      user_id,
      invited_by: userId,
      role: role || null,
      message: message || null,
    });

    return res.status(201).json({
      message: 'Invitation sent successfully',
      data: { invitation },
    });
  } catch (err) {
    if (err.message === 'Group not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to invite to this group') {
      return res.status(403).json({ message: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A pending invitation already exists for this user' });
    }
    console.error('Error sending invitation to group by user id:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const acceptInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const invitation = await invitationService.acceptInvite(id, userId);
    return res.json({
      message: 'Invitation accepted successfully',
      data: { invitation },
    });
  } catch (err) {
    if (err.message === 'Invitation not found' || err.message === 'You can only accept invitations sent to you') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Invitation is no longer pending') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Error accepting invitation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const rejectInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const invitation = await invitationService.rejectInvite(id, userId);
    return res.json({
      message: 'Invitation rejected',
      data: { invitation },
    });
  } catch (err) {
    if (err.message === 'Invitation not found' || err.message === 'You can only reject invitations sent to you') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Invitation is no longer pending') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Error rejecting invitation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const cancelInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const invitation = await invitationService.cancelInvite(id, userId);
    return res.json({
      message: 'Invitation cancelled',
      data: { invitation },
    });
  } catch (err) {
    if (err.message === 'Invitation not found') return res.status(404).json({ message: err.message });
    if (err.message === 'Only pending invitations can be cancelled' || err.message === 'Only the inviter can cancel this invitation') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Error cancelling invitation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getReceived = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const status = req.query.status || null;

    const result = await invitationService.getReceivedInvitations(userId, { page, limit, status });
    return res.json({
      message: 'Received invitations retrieved successfully',
      data: result.invitations,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('Error fetching received invitations:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const status = req.query.status || null;

    const result = await invitationService.getSentInvitations(userId, { page, limit, status });
    return res.json({
      message: 'Sent invitations retrieved successfully',
      data: result.invitations,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('Error fetching sent invitations:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const invitation = await invitationService.getInvitationById(id, userId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    return res.json({
      message: 'Invitation retrieved successfully',
      data: invitation,
    });
  } catch (err) {
    console.error('Error fetching invitation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  sendInvite,
  inviteToGroup,
  acceptInvite,
  rejectInvite,
  cancelInvite,
  getReceived,
  getSent,
  getById,
};

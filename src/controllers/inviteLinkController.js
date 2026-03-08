const inviteLinkService = require('../services/inviteLinkService');
const { findOrganizationByUserId } = require('../repository/organizationRepository');

const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { group_id } = req.params;
    const { expires_at, max_uses, message } = req.body;

    // Get user's organization
    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to create invite links',
      });
    }

    const organizationId = userOrganizations[0].id;

    const inviteLink = await inviteLinkService.createInviteLink({
      group_id,
      created_by: organizationId,
      expires_at,
      max_uses,
      message
    });

    // Generate full URL for frontend
    const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    const inviteUrl = inviteLinkService.generateInviteUrl(inviteLink.token, baseUrl);

    return res.status(201).json({
      message: 'Invite link created successfully',
      data: {
        inviteLink,
        inviteUrl
      }
    });
  } catch (err) {
    console.error('Error creating invite link:', err);
    if (err.message === 'Group not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to create invite links for this group') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

const getGroupLinks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { group_id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // Get user's organization
    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to view invite links',
      });
    }

    const organizationId = userOrganizations[0].id;

    const result = await inviteLinkService.getGroupInviteLinks(group_id, organizationId, { page, limit });

    // Add full URLs to each link
    const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    const inviteLinksWithUrls = result.inviteLinks.map(link => ({
      ...link,
      inviteUrl: inviteLinkService.generateInviteUrl(link.token, baseUrl)
    }));

    return res.json({
      message: 'Invite links retrieved successfully',
      data: {
        inviteLinks: inviteLinksWithUrls,
        pagination: result.pagination
      }
    });
  } catch (err) {
    console.error('Error retrieving invite links:', err);
    if (err.message === 'Group not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to view invite links for this group') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const validate = async (req, res) => {
  try {
    const { token } = req.params;

    const inviteData = await inviteLinkService.validateInviteLink(token);

    return res.json({
      message: 'Invite link validated successfully',
      data: inviteData
    });
  } catch (err) {
    console.error('Error validating invite link:', err);
    return res.status(400).json({ message: err.message });
  }
};

const accept = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.params;

    const result = await inviteLinkService.acceptInviteLink(token, userId);

    return res.json({
      message: 'Successfully joined the group',
      data: result
    });
  } catch (err) {
    console.error('Error accepting invite link:', err);
    if (err.message === 'You are already a member of this group') {
      return res.status(409).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { expires_at, max_uses, message, is_active } = req.body;

    // Get user's organization
    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to update invite links',
      });
    }

    const organizationId = userOrganizations[0].id;

    const updates = {};
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (max_uses !== undefined) updates.max_uses = max_uses;
    if (message !== undefined) updates.message = message;
    if (is_active !== undefined) updates.is_active = is_active;

    const updatedLink = await inviteLinkService.updateInviteLink(id, organizationId, updates);

    return res.json({
      message: 'Invite link updated successfully',
      data: { inviteLink: updatedLink }
    });
  } catch (err) {
    console.error('Error updating invite link:', err);
    if (err.message === 'Invite link not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to update this invite link') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get user's organization
    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to delete invite links',
      });
    }

    const organizationId = userOrganizations[0].id;

    await inviteLinkService.deleteInviteLink(id, organizationId);

    return res.json({
      message: 'Invite link deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting invite link:', err);
    if (err.message === 'Invite link not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to delete this invite link') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getInviteInfo = async (req, res) => {
  try {
    const { token } = req.params;

    const inviteInfo = await inviteLinkService.getInviteLinkInfo(token);

    return res.json({
      message: 'Invite link information retrieved successfully',
      data: inviteInfo
    });
  } catch (err) {
    console.error('Error retrieving invite link information:', err);
    return res.status(400).json({ message: err.message });
  }
};

module.exports = {
  create,
  getGroupLinks,
  validate,
  accept,
  update,
  remove,
  getInviteInfo
};

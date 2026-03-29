const {
  createGroup,
  findGroupById,
  getAllGroupsByOrganization,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getGroupMembers,
  isGroupMember,
  getUserGroups,
} = require('../repository/groupRepository');
const {
  findOrganizationById,
  findOrganizationByUserId,
  isOrganizationOwner,
} = require('../repository/organizationRepository');
const { findById } = require('../repository/userRepository');
const { getGroupDetails, getGroupStats } = require('../services/groupService');
const { getFullUrl } = require('../services/uploadService');

const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, image_url } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        message: 'name is required',
      });
    }

    // Get user's organization (user must be an organization owner to create groups)
    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to create groups',
      });
    }

    // Use the user's organization (first one if they have multiple)
    const organization_id = userOrganizations[0].id;

    // Create the group
    const group = await createGroup({
      organization_id,
      created_by: userId,
      name,
      description,
      image_url,
    });

    // Format image URL in response
    const formattedGroup = {
      ...group,
      image_url: group.image_url ? getFullUrl(group.image_url) : null,
    };

    return res.status(201).json({
      message: 'Group created successfully',
      data: { group: formattedGroup },
    });
  } catch (err) {
    console.error('Error creating group:', err);
    
    // Handle foreign key constraint violations
    if (err.code === '23503') {
      if (err.constraint === 'fk_group_org') {
        return res.status(400).json({
          message: 'Invalid organization_id. Organization does not exist.',
        });
      }
      return res.status(400).json({
        message: 'Foreign key constraint violation. Please check your input data.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get all groups user has access to (their groups or groups they're members of)
    const groups = await getUserGroups(userId);

    // Format image URLs for each group
    const formattedGroups = groups.map(group => ({
      ...group,
      image_url: group.image_url ? getFullUrl(group.image_url) : null,
    }));

    return res.json({
      message: 'Groups retrieved successfully',
      data: { groups: formattedGroups },
    });
  } catch (err) {
    console.error('Error retrieving groups:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getOrganizationGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const userOrganizations = await findOrganizationByUserId(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return res.status(403).json({
        message: 'You must have an organization to view organization groups',
      });
    }

    const organization_id = userOrganizations[0].id;
    const groups = await getAllGroupsByOrganization(organization_id);

    // Format image URLs for each group
    const formattedGroups = groups.map(group => ({
      ...group,
      image_url: group.image_url ? getFullUrl(group.image_url) : null,
    }));

    return res.json({
      message: 'Groups retrieved successfully',
      data: { groups: formattedGroups },
    });
  } catch (err) {
    console.error('Error retrieving organization groups:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const groupDetails = await getGroupDetails(id, userId, userRole);

    return res.json({
      message: 'Group details retrieved successfully',
      data: groupDetails,
    });
  } catch (err) {
    console.error('Error retrieving group details:', err);
    if (err.message === 'Group not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to view this group') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const { name, description, image_url } = req.body;

    const group = await findGroupById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user owns the organization (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(group.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to update this group',
        });
      }
    }

    const updatedGroup = await updateGroup(id, { name, description, image_url });

    // Format image URL in response
    const formattedGroup = {
      ...updatedGroup,
      image_url: updatedGroup.image_url ? getFullUrl(updatedGroup.image_url) : null,
    };

    return res.json({
      message: 'Group updated successfully',
      data: { group: formattedGroup },
    });
  } catch (err) {
    console.error('Error updating group:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const group = await findGroupById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user owns the organization (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(group.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to delete this group',
        });
      }
    }

    await deleteGroup(id);

    return res.json({
      message: 'Group deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting group:', err);
    
    if (err.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete group due to foreign key constraints.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const inviteMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        message: 'user_id is required',
      });
    }

    const group = await findGroupById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user owns the organization (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(group.organization_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          message: 'You do not have permission to invite members to this group',
        });
      }
    }

    // Check if user exists
    const user = await findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add member to group
    const member = await addGroupMember(id, user_id);
    
    if (!member) {
      return res.status(409).json({
        message: 'User is already a member of this group',
      });
    }

    return res.json({
      message: 'User invited to group successfully',
      data: { member },
    });
  } catch (err) {
    console.error('Error inviting member:', err);
    
    if (err.code === '23503') {
      if (err.constraint === 'fk_group_member_user') {
        return res.status(400).json({
          message: 'Invalid user_id. User does not exist.',
        });
      }
      return res.status(400).json({
        message: 'Foreign key constraint violation. Please check your input data.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, member_id } = req.params;

    const group = await findGroupById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user owns the organization or is removing themselves (unless admin)
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(group.organization_id, userId);
      const isRemovingSelf = userId === member_id;
      
      if (!isOwner && !isRemovingSelf) {
        return res.status(403).json({
          message: 'You do not have permission to remove members from this group',
        });
      }
    }

    const removedMember = await removeGroupMember(id, member_id);
    
    if (!removedMember) {
      return res.status(404).json({
        message: 'User is not a member of this group',
      });
    }

    return res.json({
      message: 'Member removed from group successfully',
    });
  } catch (err) {
    console.error('Error removing member:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const stats = await getGroupStats(id, userId, userRole);

    return res.json({
      message: 'Group stats retrieved successfully',
      data: stats,
    });
  } catch (err) {
    console.error('Error retrieving group stats:', err);
    if (err.message === 'Group not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You do not have permission to view this group') {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  getOrganizationGroups,
  getStats,
  update,
  remove,
  inviteMember,
  removeMember,
};


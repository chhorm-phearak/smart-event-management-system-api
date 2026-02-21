const {
  findOrganizationById,
  findOrganizationByUserId,
  isOrganizationOwner,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  findOrganizationMemberById,
  addOrganizationMember,
  deleteOrganizationMember,
} = require('../repository/organizationRepository');
const { findById } = require('../repository/userRepository');

// ----- Organization CRUD -----
const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;

    const organizations = await findOrganizationByUserId(userId) || [];
    return res.json({
      message: 'Organizations retrieved successfully',
      data: { organizations },
    });
  } catch (err) {
    console.error('Error retrieving organizations:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      const members = await getOrganizationMembers(id);
      const isMember = members.some((m) => m.user_id === userId);
      if (!isOwner && !isMember) {
        return res.status(403).json({ message: 'You do not have permission to view this organization' });
      }
    }
    return res.json({
      message: 'Organization retrieved successfully',
      data: { organization },
    });
  } catch (err) {
    console.error('Error retrieving organization:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { org_name, org_type, contact, email, description, status } = req.body;

    if (!org_name) {
      return res.status(400).json({ message: 'org_name is required' });
    }
    const organization = await createOrganization({
      user_id: userId,
      org_name,
      org_type,
      contact,
      email,
      description,
      status,
    });
    return res.status(201).json({
      message: 'Organization created successfully',
      data: { organization },
    });
  } catch (err) {
    console.error('Error creating organization:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const { org_name, org_type, contact, email, description, status } = req.body;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to update this organization' });
      }
    }
    const updated = await updateOrganization(id, {
      org_name,
      org_type,
      contact,
      email,
      description,
      status,
    });
    return res.json({
      message: 'Organization updated successfully',
      data: { organization: updated },
    });
  } catch (err) {
    console.error('Error updating organization:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to delete this organization' });
      }
    }
    await deleteOrganization(id);
    return res.json({ message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('Error deleting organization:', err);
    if (err.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete organization: remove members, groups, and events first.',
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ----- Organization member CRUD -----
const getMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      const members = await getOrganizationMembers(id);
      const isMember = members.some((m) => m.user_id === userId);
      if (!isOwner && !isMember) {
        return res.status(403).json({ message: 'You do not have permission to view this organization' });
      }
    }
    const members = await getOrganizationMembers(id);
    return res.json({
      message: 'Organization members retrieved successfully',
      data: members,
    });
  } catch (err) {
    console.error('Error retrieving organization members:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMemberById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, memberId } = req.params;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    const member = await findOrganizationMemberById(memberId);
    if (!member || member.organization_id !== id) {
      return res.status(404).json({ message: 'Member not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      const members = await getOrganizationMembers(id);
      const isMember = members.some((m) => m.user_id === userId);
      if (!isOwner && !isMember) {
        return res.status(403).json({ message: 'You do not have permission to view this organization' });
      }
    }
    const members = await getOrganizationMembers(id);
    const one = members.find((m) => m.id === memberId);
    return res.json({
      message: 'Organization member retrieved successfully',
      data: one || member,
    });
  } catch (err) {
    console.error('Error retrieving organization member:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const addMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: 'You do not have permission to add members to this organization' });
      }
    }
    const user = await findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (organization.user_id === user_id) {
      return res.status(400).json({ message: 'Organization owner is already a member' });
    }
    const member = await addOrganizationMember(id, user_id);
    if (!member) {
      return res.status(409).json({ message: 'User is already a member of this organization' });
    }
    return res.status(201).json({
      message: 'Member added successfully',
      data: member,
    });
  } catch (err) {
    console.error('Error adding organization member:', err);
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Invalid organization_id or user_id.' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_id;
    const { id, memberId } = req.params;

    const organization = await findOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    const member = await findOrganizationMemberById(memberId);
    if (!member || member.organization_id !== id) {
      return res.status(404).json({ message: 'Member not found' });
    }
    if (member.org_owner_id === member.user_id) {
      return res.status(400).json({ message: 'Cannot remove the organization owner' });
    }
    if (userRole !== 'admin_role') {
      const isOwner = await isOrganizationOwner(id, userId);
      const isRemovingSelf = member.user_id === userId;
      if (!isOwner && !isRemovingSelf) {
        return res.status(403).json({ message: 'You do not have permission to remove this member' });
      }
    }
    await deleteOrganizationMember(memberId);
    return res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing organization member:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMembers,
  getMemberById,
  addMember,
  removeMember,
};

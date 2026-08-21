const {
  getAllOrganizationsService,
  getOrganizationByIdService,
  updateOrganizationStatusService,
  updateOrganizationService,
  deleteOrganizationService,
} = require('../services/organizationAdminService');

const getAllOrganizations = async (req, res) => {
  try {
    const { search, status, org_type, page = 1, limit = 10 } = req.query;

    const result = await getAllOrganizationsService({
      search,
      status,
      org_type,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      message: 'Organizations retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await getOrganizationByIdService(id);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.json({
      message: 'Organization retrieved successfully',
      data: { organization },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const organization = await updateOrganizationStatusService(id, status);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.json({
      message: 'Organization status updated successfully',
      data: { organization },
    });
  } catch (err) {
    if (err.message.includes('Invalid status')) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { org_name, org_type, contact, email, description, status } = req.body;

    const organization = await updateOrganizationService(id, {
      org_name,
      org_type,
      contact,
      email,
      description,
      status,
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.json({
      message: 'Organization updated successfully',
      data: { organization },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await deleteOrganizationService(id);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.json({
      message: 'Organization deleted successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  updateOrganization,
  deleteOrganization,
};

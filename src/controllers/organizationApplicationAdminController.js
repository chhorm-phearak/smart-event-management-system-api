const {
  getAllApplicationsService,
  getApplicationByIdService,
  approveApplicationService,
  rejectApplicationService,
} = require('../services/organizationApplicationAdminService');

const getAllApplications = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const result = await getAllApplicationsService({
      search,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      message: 'Applications retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await getApplicationByIdService(id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json({
      message: 'Application retrieved successfully',
      data: { application },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await approveApplicationService(id, adminId);

    return res.json({
      message: 'Application approved successfully',
      data: result,
    });
  } catch (err) {
    if (err.message === 'Application not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Application has already been processed') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await rejectApplicationService(id, adminId);

    return res.json({
      message: 'Application rejected successfully',
      data: result,
    });
  } catch (err) {
    if (err.message === 'Application not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Application has already been processed') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
};

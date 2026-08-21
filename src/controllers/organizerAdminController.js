const {
  getOrganizerByIdService,
  getAllOrganizersService,
} = require('../services/organizerAdminService');

const getOrganizerById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizer = await getOrganizerByIdService(id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    return res.json({
      message: 'Organizer retrieved successfully',
      data: { organizer },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllOrganizers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const result = await getAllOrganizersService({
      search,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      message: 'Organizers retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getOrganizerById,
  getAllOrganizers,
};

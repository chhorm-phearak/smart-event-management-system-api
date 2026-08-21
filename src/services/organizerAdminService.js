const {
  getOrganizerById,
  getAllOrganizers,
} = require('../repository/organizerAdminRepository');
const { getFullUrl } = require('./uploadService');

const getOrganizerByIdService = async (organizerId) => {
  const organizer = await getOrganizerById(organizerId);
  
  if (!organizer) {
    return null;
  }

  // Format image URL if exists
  const formattedOrganizer = {
    ...organizer,
    img_url: organizer.img_url ? getFullUrl(organizer.img_url) : null,
  };

  return formattedOrganizer;
};

const getAllOrganizersService = async ({ search, status, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const result = await getAllOrganizers({ search, status, limit, offset });

  const organizers = result.organizers.map(organizer => ({
    ...organizer,
    img_url: organizer.img_url ? getFullUrl(organizer.img_url) : null,
  }));

  return {
    organizers,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
  };
};

module.exports = {
  getOrganizerByIdService,
  getAllOrganizersService,
};

const {
  getAllOrganizations,
  getOrganizationById,
  updateOrganizationStatus,
  deleteOrganization,
} = require('../repository/organizationAdminRepository');

const getAllOrganizationsService = async ({ search, status, org_type, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const result = await getAllOrganizations({ search, status, org_type, limit, offset });

  return {
    organizations: result.organizations,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
  };
};

const getOrganizationByIdService = async (organizationId) => {
  return await getOrganizationById(organizationId);
};

const updateOrganizationStatusService = async (organizationId, status) => {
  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status. Must be one of: ACTIVE, INACTIVE, SUSPENDED');
  }

  return await updateOrganizationStatus(organizationId, status);
};

const deleteOrganizationService = async (organizationId) => {
  return await deleteOrganization(organizationId);
};

module.exports = {
  getAllOrganizationsService,
  getOrganizationByIdService,
  updateOrganizationStatusService,
  deleteOrganizationService,
};

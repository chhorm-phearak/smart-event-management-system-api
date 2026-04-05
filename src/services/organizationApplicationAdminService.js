const {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} = require('../repository/organizationApplicationAdminRepository');
const { createOrganization } = require('../repository/organizationRepository');
const { findById } = require('../repository/userRepository');

const getAllApplicationsService = async ({ search, status, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const result = await getAllApplications({ search, status, limit, offset });

  return {
    applications: result.applications,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
  };
};

const getApplicationByIdService = async (applicationId) => {
  return await getApplicationById(applicationId);
};

const approveApplicationService = async (applicationId, adminId) => {
  const application = await getApplicationById(applicationId);
  
  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new Error('Application has already been processed');
  }

  // Update application status to APPROVED
  const updatedApplication = await updateApplicationStatus(applicationId, 'APPROVED', adminId);

  // Create the organization from the application
  const organization = await createOrganization({
    user_id: application.user_id,
    org_name: application.org_name,
    org_type: application.org_type,
    contact: application.contact,
    email: application.email,
    description: application.description,
    status: 'ACTIVE',
  });

  return {
    application: updatedApplication,
    organization,
  };
};

const rejectApplicationService = async (applicationId, adminId) => {
  const application = await getApplicationById(applicationId);
  
  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new Error('Application has already been processed');
  }

  // Update application status to REJECTED
  const updatedApplication = await updateApplicationStatus(applicationId, 'REJECTED', adminId);

  return {
    application: updatedApplication,
  };
};

module.exports = {
  getAllApplicationsService,
  getApplicationByIdService,
  approveApplicationService,
  rejectApplicationService,
};

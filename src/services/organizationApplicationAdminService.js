const {
  getOrganizationApplicationAdminStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} = require('../repository/organizationApplicationAdminRepository');
const { createOrganization } = require('../repository/organizationRepository');
const { findById } = require('../repository/userRepository');
const { createNotification } = require('./notificationService');

const getAllApplicationsService = async ({ search, status, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const [result, stats] = await Promise.all([
    getAllApplications({ search, status, limit, offset }),
    getOrganizationApplicationAdminStats(),
  ]);

  return {
    applications: result.applications,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
    stats,
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

  // Create notification for the approved organizer
  await createNotification({
    user_id: application.user_id,
    type: 'SYSTEM',
    title: 'Organization Application Approved',
    message: `Congratulations! Your organization application for "${application.org_name}" has been approved. You can now start creating events.`,
    organization_id: organization.id,
    actor_user_id: adminId,
    data: {
      application_id: applicationId,
      organization_id: organization.id,
      action: 'organization_approved'
    }
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

  // Create notification for the rejected applicant
  await createNotification({
    user_id: application.user_id,
    type: 'SYSTEM',
    title: 'Organization Application Rejected',
    message: `Your organization application for "${application.org_name}" has been rejected. Please contact support for more information.`,
    actor_user_id: adminId,
    data: {
      application_id: applicationId,
      action: 'organization_rejected'
    }
  });

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

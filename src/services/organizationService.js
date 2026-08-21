const {
  createOrganizationApplication,
  findPendingApplicationByUserId,
  findLatestApplicationByUserId,
} = require('../repository/organizationApplicationRepository');
const { findOrganizationByUserId } = require('../repository/organizationRepository');
const { createNotification } = require('./notificationService');

class OrganizationRegistrationError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'OrganizationRegistrationError';
    this.statusCode = statusCode;
  }
}

const registerOrganization = async (
  userId,
  {
    org_name,
    org_type,
    contact,
    email,
    description,
  },
) => {
  if (!userId) {
    throw new OrganizationRegistrationError(400, 'userId is required');
  }
  if (!org_name || !org_name.trim()) {
    throw new OrganizationRegistrationError(400, 'org_name is required');
  }

  const existingOrganizations = await findOrganizationByUserId(userId);
  if (existingOrganizations && existingOrganizations.length > 0) {
    throw new OrganizationRegistrationError(400, 'You already manage an organization');
  }

  const pendingApplication = await findPendingApplicationByUserId(userId);
  if (pendingApplication) {
    throw new OrganizationRegistrationError(409, 'You already have a pending organization application');
  }

  const latestApplication = await findLatestApplicationByUserId(userId);
  if (latestApplication && latestApplication.status === 'REJECTED') {
    const createdAt = latestApplication.created_at
      ? new Date(latestApplication.created_at).toISOString()
      : null;
    throw new OrganizationRegistrationError(
      400,
      createdAt
        ? `Your last application was rejected on ${createdAt}. Contact support before re-applying.`
        : 'Your last application was rejected. Contact support before re-applying.',
    );
  }

  const application = await createOrganizationApplication({
    user_id: userId,
    org_name: org_name.trim(),
    org_type,
    contact,
    email,
    description,
    status: 'PENDING',
  });

  // Notify the user that their application has been submitted
  await createNotification({
    user_id: userId,
    type: 'SYSTEM',
    title: 'Organization Application Submitted',
    message: `Your organization application for "${application.org_name}" has been submitted and is pending review.`,
    data: {
      application_id: application.id,
      action: 'organization_application_submitted',
    },
  });

  return application;
};

const getOrganizationInfo = async (userId) => {
  if (!userId) {
    throw new OrganizationRegistrationError(400, 'userId is required');
  }

  const organizations = await findOrganizationByUserId(userId);
  if (organizations && organizations.length > 0) {
    const organization = organizations[0];
    return {
      source: 'organization',
      status: organization.status || 'ACTIVE',
      data: organization,
    };
  }

  const latestApplication = await findLatestApplicationByUserId(userId);
  if (latestApplication) {
    return {
      source: 'application',
      status: latestApplication.status,
      data: latestApplication,
    };
  }

  return null;
};

module.exports = {
  registerOrganization,
  OrganizationRegistrationError,
  getOrganizationInfo,
};

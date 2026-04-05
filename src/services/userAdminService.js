const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} = require('../repository/userAdminRepository');
const { getFullUrl } = require('./uploadService');

const getAllUsersService = async ({ search, status, role_id, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const result = await getAllUsers({ search, status, role_id, limit, offset });

  const users = result.users.map(user => ({
    ...user,
    img_url: user.img_url ? getFullUrl(user.img_url) : null,
  }));

  return {
    users,
    pagination: {
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    },
  };
};

const getUserByIdService = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  return {
    ...user,
    img_url: user.img_url ? getFullUrl(user.img_url) : null,
  };
};

const updateUserStatusService = async (userId, status) => {
  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status. Must be one of: ACTIVE, INACTIVE, SUSPENDED');
  }

  return await updateUserStatus(userId, status);
};

const updateUserRoleService = async (userId, roleId) => {
  const validRoles = ['admin_role', 'user_role', 'organizer_role'];
  if (!validRoles.includes(roleId)) {
    throw new Error('Invalid role. Must be one of: admin_role, user_role, organizer_role');
  }

  return await updateUserRole(userId, roleId);
};

const deleteUserService = async (userId) => {
  return await deleteUser(userId);
};

module.exports = {
  getAllUsersService,
  getUserByIdService,
  updateUserStatusService,
  updateUserRoleService,
  deleteUserService,
};

const {
  getUserAdminStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  editUser,
} = require('../repository/userAdminRepository');
const { getFullUrl } = require('./uploadService');

const getAllUsersService = async ({ search, status, role_id, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const [result, stats] = await Promise.all([
    getAllUsers({ search, status, role_id, limit, offset }),
    getUserAdminStats(),
  ]);

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
    stats,
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

const editUserService = async (userId, userData) => {
  const { first_name, last_name, email, gender, contact, address, date_of_birth } = userData;
  
  // Validate email format if provided
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }
  
  // Validate gender if provided
  if (gender !== undefined) {
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    if (!validGenders.includes(gender)) {
      throw new Error('Invalid gender. Must be one of: MALE, FEMALE, OTHER');
    }
  }
  
  // Validate date of birth if provided
  if (date_of_birth !== undefined) {
    const dob = new Date(date_of_birth);
    const now = new Date();
    if (isNaN(dob.getTime()) || dob >= now) {
      throw new Error('Invalid date of birth');
    }
  }
  
  const updatedUser = await editUser(userId, userData);
  if (!updatedUser) {
    throw new Error('User not found');
  }
  
  return {
    ...updatedUser,
    img_url: updatedUser.img_url ? getFullUrl(updatedUser.img_url) : null,
  };
};

module.exports = {
  getAllUsersService,
  getUserByIdService,
  updateUserStatusService,
  updateUserRoleService,
  deleteUserService,
  editUserService,
};

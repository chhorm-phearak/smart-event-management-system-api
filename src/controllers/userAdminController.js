const {
  getAllUsersService,
  getUserByIdService,
  updateUserStatusService,
  updateUserRoleService,
  deleteUserService,
  editUserService,
} = require('../services/userAdminService');

const getAllUsers = async (req, res) => {
  try {
    const { search, status, role_id, page = 1, limit = 10 } = req.query;

    const result = await getAllUsersService({
      search,
      status,
      role_id,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      message: 'Users retrieved successfully',
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdService(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const user = await updateUserStatusService(id, status);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User status updated successfully',
      data: { user },
    });
  } catch (err) {
    if (err.message.includes('Invalid status')) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
      return res.status(400).json({ message: 'role_id is required' });
    }

    const user = await updateUserRoleService(id, role_id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User role updated successfully',
      data: { user },
    });
  } catch (err) {
    if (err.message.includes('Invalid role')) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await deleteUserService(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User deleted successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;

    // Validate that at least one field is provided
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({ message: 'At least one field must be provided for update' });
    }

    const user = await editUserService(id, userData);

    return res.json({
      message: 'User updated successfully',
      data: { user },
    });
  } catch (err) {
    console.error(err);
    
    // Handle specific validation errors
    if (err.message.includes('Invalid email') || 
        err.message.includes('Invalid gender') || 
        err.message.includes('Invalid date of birth') ||
        err.message.includes('User not found')) {
      return res.status(400).json({ message: err.message });
    }
    
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  editUser,
};

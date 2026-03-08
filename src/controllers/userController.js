const { listUsers, searchUsersByEmail } = require('../repository/userRepository');

const getUsers = async (req, res) => {
  try {
    const search = req.query.search || null;
    // Fixed limit 10 as requested
    const limit = 10;

    const users = await listUsers({
      search,
      limit,
      offset: 0,
    });

    return res.json({
      message: 'Users retrieved successfully',
      data: users,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUsersByEmail = async (req, res) => {
  try {
    const email = req.query.email || req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = parseInt(req.query.offset, 10) || 0;

    const users = await searchUsersByEmail({
      email,
      limit,
      offset,
    });

    return res.json({
      message: 'Users retrieved successfully',
      data: users,
    });
  } catch (err) {
    console.error('Error searching users by email:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  getUsersByEmail,
};


const notificationService = require('../services/notificationService');

const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role_id === 'admin_role';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    let isReadFilter = null;
    if (!isAdmin) {
      if (req.query.is_read === 'true') isReadFilter = true;
      if (req.query.is_read === 'false') isReadFilter = false;
    }

    const result = await notificationService.getNotificationsForUser(userId, {
      page,
      limit,
      is_read: isReadFilter,
    });

    const notifications = result.notifications.map((n) => ({
      ...n,
      status: n.is_read ? 'read' : 'unread',
    }));

    return res.json({
      message: 'Notifications retrieved successfully',
      data: notifications,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    return res.json({
      message: 'Unread count retrieved',
      data: { count },
    });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(id, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json({
      message: 'Notification retrieved successfully',
      data: notification,
    });
  } catch (err) {
    console.error('Error fetching notification:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json({
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);
    return res.json({
      message: 'All notifications marked as read',
      data: { count },
    });
  } catch (err) {
    console.error('Error marking all as read:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAll,
  getUnreadCount,
  getById,
  markAsRead,
  markAllAsRead,
};

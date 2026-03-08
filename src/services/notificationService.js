const notificationRepository = require('../repository/notificationRepository');

/**
 * Create a single notification (used internally or by other services).
 */
const createNotification = async (payload) => {
  return notificationRepository.create(payload);
};

/**
 * Create multiple notifications in one go (e.g. event update to many users).
 */
const createNotifications = async (payloads) => {
  return notificationRepository.createMany(payloads);
};

/**
 * Get paginated notifications for the current user.
 */
const getNotificationsForUser = async (userId, options = {}) => {
  return notificationRepository.getByUserId(userId, options);
};

/**
 * Get one notification by id; ensure it belongs to the user.
 */
const getNotificationById = async (id, userId) => {
  const notification = await notificationRepository.findById(id);
  if (!notification || notification.user_id !== userId) return null;
  return notification;
};

/**
 * Mark one notification as read.
 */
const markAsRead = async (id, userId) => {
  return notificationRepository.markAsRead(id, userId);
};

/**
 * Mark all notifications as read for the user.
 */
const markAllAsRead = async (userId) => {
  return notificationRepository.markAllAsRead(userId);
};

/**
 * Get unread count for the user.
 */
const getUnreadCount = async (userId) => {
  return notificationRepository.getUnreadCount(userId);
};

module.exports = {
  createNotification,
  createNotifications,
  getNotificationsForUser,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};

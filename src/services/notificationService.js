const notificationRepository = require('../repository/notificationRepository');
const { emitToUser, emitToOrganization, emitToEvent, emitToGroup } = require('../config/socket');

/**
 * Create a single notification (used internally or by other services).
 * Automatically emits real-time notification to the user.
 */
const createNotification = async (payload) => {
  const notification = await notificationRepository.create(payload);
  
  // Emit real-time notification to the user
  if (notification && notification.user_id) {
    emitToUser(notification.user_id, 'notification', notification);
  }
  
  return notification;
};

/**
 * Create multiple notifications in one go (e.g. event update to many users).
 * Automatically emits real-time notifications to each user.
 */
const createNotifications = async (payloads) => {
  const notifications = await notificationRepository.createMany(payloads);
  
  // Emit real-time notification to each user
  for (const notification of notifications) {
    if (notification && notification.user_id) {
      emitToUser(notification.user_id, 'notification', notification);
    }
  }
  
  return notifications;
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

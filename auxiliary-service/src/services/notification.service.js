import notificationRepository from "../repositories/notification.repository.js";
import { redisPublisher } from "../config/redis.js";

const createNotification = async ({ userId, title, body, type }) => {
  const notification = await notificationRepository.createNotification({
    userId,
    title,
    body,
    type,
  });

  // Notificar al Core Service vía Redis Pub/Sub
  try {
    await redisPublisher.publish("notification:created", JSON.stringify(notification));
  } catch (err) {
    console.error("❌ [NotificationService] Error al publicar en Redis:", err.message);
  }

  return notification;
};

const getNotificationsByUser = async (userId) => {
  return await notificationRepository.getByUser(userId);
};

const markNotificationAsRead = async (id) => {
  return await notificationRepository.markAsRead(id);
};

const deleteNotification = async (id) => {
  return await notificationRepository.deleteNotification(id);
};

export default { 
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
  deleteNotification
};

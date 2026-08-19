import { subscribeToEvent } from "../../utils/eventBus.js";

export const initNotificationSubscriber = (io) => {
  subscribeToEvent("notification:created", async (payload) => {
    try {
      const notification = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const { userId } = notification;

      if (!userId) {
        console.warn("⚠️ [NotificationSubscriber] Notificación sin userId recibida");
        return;
      }


      // Emitir a la sala privada del usuario
      io.to(`user:${userId}`).emit("notification", {
        ...notification,
        message: notification.body // Adaptamos body -> message para el frontend
      });

    } catch (err) {
      console.error("❌ [NotificationSubscriber] Error procesando evento:", err.message);
    }
  });
};

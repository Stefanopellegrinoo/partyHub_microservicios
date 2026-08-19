import notificationService from "../services/notification.service.js";

const create = async (req, res) => {
  const { userId, title, body, type } = req.body;
  try {
    const notification = await notificationService.createNotification({ userId, title, body, type });
    res.json(notification);
  } catch (e) {
    console.error("❌ Error creando notificación:", e.message);
    res.status(500).json({ error: "Error al crear la notificación" });
  }
};

const getByUser = async (req, res) => {
  const userId = parseInt( req.user.id);
  if (!userId) return res.status(400).json({ error: "userId requerido" });

  try {
    const notis = await notificationService.getNotificationsByUser(userId);
    res.json(notis);
  } catch (e) {
    console.error("❌ Error al obtener notificaciones:", e.message);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
};

const markRead = async (req, res) => {
  const userId=  req.user.id;
  if (!userId) return res.status(400).json({ error: "userId requerido" });
 const notiId=  req.params.id;
  try {
    const updated = await notificationService.markNotificationAsRead(notiId);
    res.json(updated);
  } catch (e) {
    console.error("❌ Error al marcar como leída:", e.message);
    res.status(500).json({ error: "Error al actualizar notificación" });
  }
};

const deleteNotification = async (req, res) => {
  const notiId=  req.params.id;
  if (!notiId) return res.status(400).json({ error: "notiId requerido" });

  try {
    const updated = await notificationService.deleteNotification(notiId);
    res.json(updated);
  } catch (e) {
    console.error("❌ Error al marcar como leída:", e.message);
    res.status(500).json({ error: "Error al actualizar notificación" });
  }
};

export default {
  create,
  getByUser,
  markRead,
  deleteNotification
};
import { subscribeToEvent } from "../utils/eventBus.js";
import notificationService from "../services/notification.service.js";
import authClient from "../clients/auth.client.js";

const shouldNotify = (user, type) => {
  if (!user || !user.preferences) return true; // Default si no hay preferencias
  const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
  
  switch(type) {
    case 'sale': 
    case 'low_stock': 
    case 'out_of_stock': 
      return prefs.ticketSales !== false;
    case 'reminder': 
    case 'new_party':
      return prefs.newParty !== false;
    default: 
      return true;
  }
};

export const initNotificationListeners = () => {

  // --- Caso 1: Stock Bajo ---
  subscribeToEvent("tanda:low-stock", async (data) => {
    try {
      const user = await authClient.getUserById(data.organizerId);
      if (shouldNotify(user, 'low_stock')) {
        await notificationService.createNotification({
          userId: data.organizerId,
          title: "⚠️ ¡Quedan pocas entradas!",
          body: `La tanda "${data.batchName}" está por agotarse.`,
          type: "low_stock",
        });
      }
    } catch (e) { console.error("❌ Error en tanda:low-stock:", e.message); }
  });

  // --- Caso 2: Tanda Agotada ---
  subscribeToEvent("tanda:out-of-stock", async (data) => {
    try {
      const user = await authClient.getUserById(data.organizerId);
      if (shouldNotify(user, 'out_of_stock')) {
        await notificationService.createNotification({
          userId: data.organizerId,
          title: "🚫 Una tanda se agotó",
          body: data.newBatchName
            ? `La tanda "${data.batchName}" se agotó. Activamos "${data.newBatchName}".`
            : `La tanda "${data.batchName}" se agotó. No hay otra tanda activa.`,
          type: "out_of_stock",
        });
      }
    } catch (e) { console.error("❌ Error en tanda:out-of-stock:", e.message); }
  });

  // --- Caso 3: Recordatorio ---
  subscribeToEvent("event:reminder", async (data) => {
    try {
      const user = await authClient.getUserById(data.userId);
      if (shouldNotify(user, 'reminder')) {
        await notificationService.createNotification({
          userId: data.userId,
          title: "🎉 ¡Falta poco para tu fiesta!",
          body: `La fiesta "${data.eventName}" es en 7 días.`,
          type: "reminder",
        });
      }
    } catch (e) { console.error("❌ Error en event:reminder:", e.message); }
  });

  // --- Caso 4: Venta Confirmada ---
  subscribeToEvent("purchase.confirmed", async (data) => {
    if (data.organizerId) {
      try {
        const user = await authClient.getUserById(data.organizerId);
        if (shouldNotify(user, 'sale')) {
          await notificationService.createNotification({
            userId: data.organizerId,
            title: "💰 Nueva Venta",
            body: `${data.attendees?.length || 1} entradas vendidas para "${data.partyName || 'Evento'}".`,
            type: "sale",
          });
        }
      } catch (e) { console.error("❌ Error en purchase.confirmed:", e.message); }
    }
  });

  // --- Caso 5: Ticket Cancelado ---
  subscribeToEvent("ticket.canceled", async (data) => {
    if (data.organizerId) {
      try {
        const user = await authClient.getUserById(data.organizerId);
        if (shouldNotify(user, 'sale')) { // Las cancelaciones se rigen por la preferencia de ventas
          await notificationService.createNotification({
            userId: data.organizerId,
            title: "📉 Ticket Cancelado",
            body: `Se canceló la entrada de ${data.attendeeName} en "${data.partyName || 'Evento'}".`,
            type: "cancellation",
          });
        }
      } catch (e) { console.error("❌ Error en ticket.canceled:", e.message); }
    }
  });
};

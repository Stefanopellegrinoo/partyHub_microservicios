import { subscribeToEvent } from "../../utils/eventBus.js";
import redis from "../config/redis.js";

const EXPIRED_CHANNEL = "__keyevent@0__:expired";

export const initRedisExpirationSubscriber = (io) => {
  subscribeToEvent(EXPIRED_CHANNEL, async (message) => {
    // Nota: El eventBus ya hizo JSON.parse, pero las expiraciones de Redis son strings planos.
    const expiredKey = typeof message === 'string' ? message : JSON.stringify(message);

    if (expiredKey.startsWith("reservation:")) {
      try {

        const parts = expiredKey.split(":");
        if (parts.length < 6 || parts[4] !== "qty") {
          console.warn("⚠️ [Expiration] Formato de key de reserva desconocido, se ignora.");
          return;
        }

        const partyId = parts[1];
        const tandaId = parts[2];
        const quantity = parseInt(parts[5]);

        if (isNaN(quantity)) {
          console.error("❌ [Expiration] Cantidad inválida en key expirada");
          return;
        }

        const stockKey = `tanda:${tandaId}:stock`;
        const newStock = await redis.incrby(stockKey, quantity);

        // Notificar a los clientes vía Socket.io
        io.to(`party:${partyId}`).emit("reservation-expired", {
          batchId: Number(tandaId),
          quantity: quantity,
          remainingStock: newStock
        });

      } catch (error) {
        console.error("❌ [Expiration] Error restaurando stock:", error.message);
      }
    }
  });
};

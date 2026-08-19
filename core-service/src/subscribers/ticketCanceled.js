import { subscribeToEvent } from "../../utils/eventBus.js";
import tandaRepository from "../repositories/tandaRepository.js";
import prisma from "../config/prisma.js";
import redis from "../config/redis.js";

export const initTicketCanceledSubscriber = (io) => {
  subscribeToEvent("ticket.canceled", async (payload) => {
    const { eventId, tandaId, attendeeName, price } = payload;
    

    if (!tandaId || !eventId) {
      console.error("❌ [Subscriber] Datos de evento inválidos (tandaId o eventId faltantes)");
      return;
    }

    try {
      const nTandaId = Number(tandaId);
      const nEventId = Number(eventId);
      
      const tanda = await tandaRepository.getById(nTandaId);

      if (!tanda) {
        console.error(`❌ Tanda ${tandaId} no encontrada al procesar cancelación.`);
        return;
      }

      if (tanda.is_active) {
        // --- CASO 1: Tanda Activa -> Devolvemos stock a la misma tanda ---
        await prisma.tandas.update({
          where: { id: nTandaId },
          data: { sold_tickets: { decrement: 1 } }
        });

        const stockKey = `tanda:${nTandaId}:stock`;
        let newStock = null;
        if (await redis.exists(stockKey)) {
          newStock = await redis.incr(stockKey);
        }

        // Notificar a los clientes vía Socket.io
        io.to(`party:${nEventId}`).emit("reservation-cancelled", {
          batchId: nTandaId,
          quantity: 1,
          remainingStock: newStock
        });

      } else {
        // --- CASO 2: Tanda Cerrada -> El cupo sale de la tanda y va al Pool ---
        await prisma.$transaction(async (tx) => {
          await tx.tandas.update({
            where: { id: nTandaId },
            data: { 
              sold_tickets: { decrement: 1 },
              capacity: { decrement: 1 } 
            }
          });

          await tx.canceled_tickets.create({
            data: {
              event_id: nEventId,
              original_tanda_id: nTandaId,
              attendee_name: attendeeName,
              price: price
            }
          });
        });

        // Notificar al panel de administración que el pool cambió
        io.to(`party:${nEventId}`).emit("pool-updated", { eventId: nEventId });

      }
    } catch (err) {
      console.error("❌ Error al manejar ticket.canceled:", err.message);
    }
  });
};

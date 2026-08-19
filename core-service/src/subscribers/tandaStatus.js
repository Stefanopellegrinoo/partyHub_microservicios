import { subscribeToEvent } from "../../utils/eventBus.js";

export const initTandaStatusSubscriber = (io) => {
  // Escuchar cuando una tanda se agota
  subscribeToEvent("tanda:out-of-stock", async (payload) => {
    const { tandaId, partyId, newBatchId } = payload;
    

    // Avisar que la tanda vieja se cerró
    io.to(`party:${partyId}`).emit("tanda-status-updated", {
      batchId: Number(tandaId),
      newStatus: false
    });

    // Si hay una nueva tanda activada, avisar para que el front la habilite
    if (newBatchId) {
      io.to(`party:${partyId}`).emit("tanda-status-updated", {
        batchId: Number(newBatchId),
        newStatus: true
      });
    }
  });
};

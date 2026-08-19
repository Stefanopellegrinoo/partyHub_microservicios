import { subscribeToEvent } from "../utils/eventBus.js";
import { getUserById } from "../clients/auth.client.js";

// Servicios necesarios
import { createReport } from "../services/report.service.js";
import attendeeService from "../services/attendeeService.js"; // registerAttendees

export const initSalesListeners = () => {


  subscribeToEvent(
    "tickets.confirmed",
    async ({ newAttendees, tandaId, sellerId, eventId, tandaName, tandaPrice }) => {

      if (!Array.isArray(newAttendees) || newAttendees.length === 0) {
        console.warn("⚠️ Payload sin asistentes, se ignora.");
        return;
      }

      const taskReport = async () => {
        try {
          let sellerName = "Desconocido";
          
          if (sellerId) {
            const sellerData = await getUserById(sellerId);
            if (sellerData) {
              sellerName = sellerData.name || sellerData.email || `Vendedor ${sellerId}`;
            }
          }


          await createReport(
            eventId,
            tandaId,
            tandaName,
            tandaPrice,
            sellerId,
            sellerName,
            newAttendees
          );
        } catch (err) {
          console.error("❌ Error generando reporte:", err.message);
        }
      };

      const taskAttendees = async () => {
        try {
          const created = await attendeeService.registerAttendees(
            newAttendees,
            eventId,
            tandaId,
            sellerId,
            tandaName,
            tandaPrice
          );
        } catch (err) {
          console.error("❌ Error CRÍTICO registrando asistentes:", err.message);
        }
      };

      await Promise.all([taskReport(), taskAttendees()]);
    }
  );

};
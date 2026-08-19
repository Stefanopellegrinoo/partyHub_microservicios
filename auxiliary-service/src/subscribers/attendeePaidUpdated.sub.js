import { updatePaidStatus } from "../services/report.service.js";
import { subscribeToEvent } from "../utils/eventBus.js";

subscribeToEvent(
  "attendee.paid_updated",
  async (data) => {

   try {
    const { attendeeId } = data;

    const updated = await updatePaidStatus(attendeeId);

    if (updated.count === 0) {
      console.warn(`⚠️ No se encontró report_event con attendee_id: ${attendeeId}`);
    } else {
    }

  } catch (err) {
    console.error("❌ Error actualizando report_events:", err.message);
  }
  }
);

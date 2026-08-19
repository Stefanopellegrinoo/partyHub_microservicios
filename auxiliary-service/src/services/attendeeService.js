import { attendeeRepository } from "../repositories/attendeeRepository.js";
import { updatePaidStatus} from "./report.service.js";
import { qrQueue } from "../queues/qrQueue.js";
import { publishEvent } from "../utils/eventBus.js";

const getByEventId = async (eventId) => {
  return await attendeeRepository.findByEventId(eventId);
};

const getByTandaId = async (tandaId) => {
  return await attendeeRepository.findByTandaId(tandaId);
};

const findById = async (tandaId) => {
  return await attendeeRepository.findById(tandaId);
};

export const registerAttendees = async (
  attendees,
  eventId,
  tandaId,
  sellerId,
  tandaName, 
  tandaPrice
) => {
  const created = await attendeeRepository.createMany(
    attendees,
    eventId,
    tandaId,
    sellerId,
    tandaName, 
  tandaPrice
  );

  for (const att of created) {
    if (att.paid) {
      await qrQueue.add("send-ticket", att, {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: { age: 86400 },
      });
    } else {
    }
  }

  return created;
};

// controllers/attendeeController.js
const markAttendeeAsPaid = async (attendeeId) => {
  try {
    const attendee = await attendeeRepository.findById(attendeeId);

    if (!attendee) {
      throw new Error("Attendee no encontrado");
    }

    if (attendee.paid) {
      throw new Error("El asistente ya estaba marcado como pago");
    }

    // 1. Marcar como pagado de forma atómica
    const updateAttendee = await attendeeRepository.updatePaidStatus(attendeeId);

    if (!updateAttendee) {
      throw new Error("El asistente ya estaba marcado como pago (condición de carrera prevenida)");
    }

    const u = await updatePaidStatus(attendeeId);

    if (!u || u.count === 0) {
     throw new Error("Error al actualizar report_events");
    }

    await qrQueue.add("send-ticket", updateAttendee, {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
    });

    return updateAttendee;
  } catch (err) {
    console.error("❌ Error actualizando pago:", err.message);
    return "Error interno del servidor";
  }
};

const deleteAttendee = async (attendeeId) => {
  const attendee = await attendeeRepository.findById(attendeeId);
  if (!attendee) throw new Error("Asistente no encontrado");

  // Borrar de la base de datos
  const deleted = await attendeeRepository.deleteAttendee(attendeeId);

  // Notificar al Core Service vía Redis
  try {
    await publishEvent("ticket.canceled", {
      eventId: attendee.event_id,
      tandaId: attendee.tanda_id,
      attendeeName: attendee.full_name,
      price: attendee.tanda_price,
    });
  } catch (err) {
    console.error("❌ Falló el aviso de cancelación al Core:", err.message);
  }

  return deleted;
};

export default {
  getByEventId,
  getByTandaId,
  findById,
  registerAttendees,
  markAttendeeAsPaid,
  deleteAttendee,
};

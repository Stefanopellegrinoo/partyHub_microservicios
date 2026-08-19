import { checkIfHasAccess, checkIfOrganizer } from "../utils/checkOrganizer.js"
import attendeeService from "../services/attendeeService.js";

export const getAttendeesByEvent = async (req, res) => {
  const { partyId } = req.params;
  try {
    const hasAccess = await checkIfHasAccess(req.user.id, partyId);
    if (!hasAccess) {
      return res.status(403).json({ error: "No tenés permiso para ver los asistentes" });
    }
    const attendees = await attendeeService.getByEventId(Number(partyId));

    res.json(attendees);
  } catch (err) {
    console.error("Error obteniendo asistentes:", err);
    res.status(500).json({ error: "Error al obtener asistentes" });
  }
};

export const getAttendeesByTanda = async (req, res) => {
  const { tandaId } = req.params;
  try {
    const attendees = await attendeeService.getByTandaId(tandaId);
    res.json(attendees);
  } catch (err) {
    console.error("Error obteniendo asistentes por tanda:", err);
    res.status(500).json({ error: "Error al obtener asistentes" });
  }
};


export const createAttendees = async (req, res) => {
  const { attendees, eventId, tandaId, sellerId } = req.body;

  if (!Array.isArray(attendees) || !eventId || !tandaId || !sellerId) {
    return res.status(400).json({ error: "Datos inválidos para crear asistentes" });
  }

  try {
    const result = await attendeeService.registerAttendees(attendees, eventId, tandaId, sellerId);
    res.status(201).json({ message: "Asistentes registrados", data: result });
  } catch (err) {
    console.error("❌ Error registrando asistentes:", err);
    res.status(500).json({ error: "Error interno al registrar asistentes. Verifique los datos e intente nuevamente." });
  }
};



export const updateAttendeePaidStatus = async (req, res) => {
  const { attendeeId, eventId } = req.params;
  const userId = req.user.id

  try {
    const isOrg = await checkIfOrganizer(userId, Number(eventId))
    if (!isOrg) return res.status(403).json({ error: "No autorizado" })

    const updated = await attendeeService.markAttendeeAsPaid(attendeeId)
    return res.json(updated)
  } catch (err) {
    console.error("❌ Error actualizando estado de pago:", err)
    return res.status(500).json({ error: "Error interno del servidor" })
  }
}

export const deleteAttendee = async (req, res) => {
  const { attendeeId, eventId } = req.params;
  const userId = req.user.id;

  try {
    const isOrg = await checkIfOrganizer(userId, Number(eventId));
    if (!isOrg) {
      return res.status(403).json({ error: "No tenés permiso para borrar asistentes" });
    }

    await attendeeService.deleteAttendee(attendeeId);
    res.json({ message: "Asistente eliminado y evento de cancelación emitido" });
  } catch (err) {
    console.error("❌ Error eliminando asistente:", err.message);
    res.status(500).json({ error: "Error interno al eliminar asistente" });
  }
};

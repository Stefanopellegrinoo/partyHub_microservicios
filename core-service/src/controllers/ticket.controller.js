import ticketService from "../services/ticket.service.js";
import eventService from "../services/event.service.js";

const reserve = async (req, res) => {
  const { partyId, batchId } = req.params;
  const { quantity } = req.body;
  const sellerId = req.user.id;
  const io = req.io;

  if (!batchId ||!partyId  || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  try {
    const message = await ticketService.reserveTickets(Number(batchId), quantity, sellerId, Number(partyId), io);
    res.json({ message });
  } catch (err) {
    console.error("❌ Error en operación de tickets:", err.message);
    res.status(400).json({ error: "No se pudo procesar la solicitud de tickets. Verifique los datos o intente más tarde." });
  }
};

const confirm = async (req, res) => {
  const { partyId, batchId } = req.params;
   const { attendees } = req.body;
  const sellerId = req.user.id;
  

if (!Array.isArray(attendees) || attendees.length === 0) {
  return res.status(400).json({ error: "Lista de asistentes inválida o vacía" });
}

  try {
    const message = await ticketService.confirmPurchase(Number(batchId), sellerId, Number(partyId), attendees);
    res.json({ message });
  } catch (err) {
    console.error("❌ Error en operación de tickets:", err.message);
    res.status(400).json({ error: "No se pudo procesar la solicitud. Intente más tarde." });
  }
};

const cancel = async (req, res) => {
  const { partyId, batchId  } = req.params;
  const sellerId = req.user.id;
  const io = req.io;

  try {
    const message = await ticketService.cancelReservation( Number(partyId), Number(batchId) , sellerId, io);
    res.json({ message });
  } catch (err) {
    console.error("❌ Error en operación de tickets:", err.message);
    res.status(400).json({ error: "No se pudo procesar la solicitud. Intente más tarde." });
  }
};

const getReservation = async (req, res) => {
  try {
  const sellerId = Number(req.user.id) ;
 const { partyId } = req.params;
    const data = await ticketService.getReservation(Number(partyId), sellerId );
    if (!data) return res.json({ hasReservation: false });

    res.json(data);
  } catch (err) {
    console.error("❌ Error obteniendo reserva:", err);
    res.status(500).json({ error: "Error al obtener la reserva activa" });
  }
};

const getCanceledPool = async (req, res) => {
  const { partyId } = req.params;
  const userId = req.user.id;

  try {
    const isOrg = await eventService.isOrganizerOfEvent(Number(partyId), userId);
    if (!isOrg) return res.status(403).json({ error: "No autorizado" });

    const pool = await ticketService.getCanceledPool(partyId);
    res.json(pool);
  } catch (err) {
    console.error("❌ Error obteniendo pool:", err);
    res.status(500).json({ error: "Error al obtener el pool de cancelaciones" });
  }
};

const injectPooledTicket = async (req, res) => {
  const { partyId, ticketId } = req.params;
  const userId = req.user.id;

  try {
    const isOrg = await eventService.isOrganizerOfEvent(Number(partyId), userId);
    if (!isOrg) return res.status(403).json({ error: "No autorizado" });

    const result = await ticketService.injectPooledTicket(ticketId, partyId);
    res.json(result);
  } catch (err) {
    console.error("❌ Error en operación de tickets:", err.message);
    res.status(400).json({ error: "No se pudo procesar la solicitud. Intente más tarde." });
  }
};

const validateTicket = async (req, res) =>  {
    const { ticketCode } = req.body;

    const attendee = await attendeeRepository.findByTicketCode(ticketCode);
    if (!attendee) return res.status(404).json({ error: "Entrada no válida" });

    if (attendee.used_at) {
      return res.status(400).json({ error: "Entrada ya usada" });
    }

    await attendeeRepository.markAsUsed(ticketCode);

    res.json({ valid: true, attendee });
  }

export default {
  reserve,
  confirm,
  cancel,
  getReservation,
  getCanceledPool,
  injectPooledTicket,
  validateTicket,
};

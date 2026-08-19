import eventService from "../services/event.service.js";

const createEvent = async (req, res) => {
  if (!req.body) {
    console.error("❌ [EventController]: req.body es undefined! Headers:", req.headers);
    return res.status(400).json({ error: "No se recibieron datos (req.body undefined)" });
  }

  const { name, location, date } = req.body;
  const organizerId = req.user.id;

  try {
    const event = await eventService.createEvent(
      name,
      location,
      date,
      organizerId
    );
    res.json({
      message: "Evento creado correctamente",
      eventId: event.id,
      inviteCode: event.invite_code,
    });
  } catch (err) {
    console.error("❌ [EventController - createEvent Error]:", err.message);
    res.status(400).json({ error: "No se pudo crear el evento. Verifique los datos." });
  }
};

const joinEvent = async (req, res) => {
  const { code } = req.body;
  const sellerId = req.user.id;

  try {
    const response = await eventService.joinEvent(code, sellerId);
    res.json(response);
  } catch (err) {
    console.error("❌ [EventController - joinEvent Error]:", err.message);
    res.status(400).json({ error: "Error al unirse al evento. Verifique el código." });
  }
};

const getUserEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "ID de usuario no proporcionado" });
    }
    const events = await eventService.getUserEvents(userId);
    res.json(events);
  } catch (err) {
    console.error("❌ [EventController - getUserEvents Error]:", err.message);
    res.status(500).json({ error: "Error al obtener los eventos del usuario." });
  }
};

const getPartyDetails = async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(partyId)) {
      return res.status(400).json({ error: "ID de evento inválido." });
    }
    
    const isMember = await eventService.isSellerOrOrganizerInEvent(userId, partyId);
    
    if (!isMember) {
      return res.status(403).json({ error: "No tienes acceso a los detalles de este evento." });
    }

    const details = await eventService.getEventDetails(partyId);

    if (!details) {
      return res.status(404).json({ error: "Evento no encontrado." });
    }
    res.json(details);
  } catch (err) {
    console.error(`❌ [EventController - getPartyDetails Error]:`, err.message);
    res.status(500).json({ error: "Error interno al obtener detalles del evento." });
  }
};

/**
 * Endpoint interno para validar si un usuario es organizador.
 * Usado por otros microservicios vía API Gateway o comunicación directa.
 */
const checkOrganizer = async (req, res) => {
  const { id: eventId } = req.params;
  const userId = req.user?.id || Number(req.headers["x-user-id"]);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "ID de usuario no válido o no proporcionado." });
  }

  try {
    const isOrganizer = await eventService.isOrganizerOfEvent(Number(eventId), userId);
    return res.json({ isOrganizer: !!isOrganizer });
  } catch (err) {
    console.error("❌ [EventController - checkOrganizer Error]:", err.message);
    return res.status(500).json({ error: "Error interno de validación." });
  }
};

const checkAccess = async (req, res) => {
  const { id: eventId } = req.params;
  const userId = req.user?.id || Number(req.headers["x-user-id"]);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "ID de usuario no válido o no proporcionado." });
  }

  try {
    const canAccess = await eventService.isSellerOrOrganizerInEvent(userId, Number(eventId));
    return res.json({ canAccess: !!canAccess });
  } catch (err) {
    console.error("❌ [EventController - checkAccess Error]:", err.message);
    return res.status(500).json({ error: "Error interno de validación de acceso." });
  }
};

export default {
  createEvent,
  joinEvent,
  getUserEvents,
  getPartyDetails,
  checkOrganizer, 
  checkAccess
};

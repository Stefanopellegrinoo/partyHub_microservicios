
import eventService from "../services/event.service.js";
import tandaService from "../services/tanda.service.js";

const getByEvent = async (req, res) => {
  try {

    const eventId = Number(req.params.partyId);
    if (!eventId) return res.status(400).json({ error: "event_id requerido" });

    const tandas = await tandaService.getTandasByEvent(eventId);
    res.json(tandas);
  } catch (err) {
    console.error("❌", err);
    res.status(500).json({ error: "Error al obtener tandas" });
  }
};

const addTanda = async (req, res) => {
  try {

    const eventId = Number(req.params.partyId);
    const data = req.body;
    const userId = Number(req.user.id);

    const isOrganizeer = await eventService.isOrganizerOfEvent(eventId, userId);
    if (!isOrganizeer) {
      return res.status(403).json({ error: "No tiene permisos para crear tandas" });
    }

    const tanda = await tandaService.createTanda(eventId, userId, data);

    res.status(201).json(tanda);
  } catch (err) {
    console.error("❌ Error en operación de tandas:", err.message);
    res.status(400).json({ error: "Error al procesar la tanda. Verifique los datos." });
  }
};

const toggleTanda = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const eventId = Number(req.params.partyId);
    const batchId = Number(req.params.batchId);
    const io = req.io;


    const isOrganizeer =  await eventService.isOrganizerOfEvent(eventId, userId);

    if (!isOrganizeer) {
      return res.status(404).json({ error: "No tiene permisos para crear tandas" });
    }


    const newStatus = await tandaService.toggleTanda(batchId, eventId, userId, io);

    res.json({ message: `Tanda ${newStatus ? "activada" : "desactivada"}` });
  } catch (err) {
    console.error("❌ Error en operación de tandas:", err.message);
    res.status(400).json({ error: "No se pudo procesar el cambio en la tanda." });
  }
};

export default {
  getByEvent,
  addTanda,
  toggleTanda,
};

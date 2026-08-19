import eventService from "../services/event.service.js";
import { eventSellerService } from "../services/eventSeller.service.js";


  const getSellers = async (req, res) => {
    const { partyId } = req.params;
    const userId = req.user.id;

    const isOrg = await eventService.isSellerOrOrganizerInEvent(
      userId,
      Number(partyId), 
    );

    if (!isOrg)
      throw new Error("No es  miembro de la fiesta");

    try {
      const sellers = await eventSellerService.getSellers(Number(partyId), userId);
      res.json(sellers);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }


  const removeSeller = async (req, res) => {
    const { partyId, requesterId } = req.params;
    const userId = req.user.id;

    try {
      await eventSellerService.removeSeller(Number(partyId), userId, Number(requesterId));
      res.status(204).end();
    } catch (error) {
      const status = error.message.includes("permiso") ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  

export const leaveEventAsSeller = async (req, res) => {
  const userId = req.user.id;
  const eventId = Number(req.params.eventId);

  try {
    const result = await eventSellerService.abandonEvent(eventId, userId);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export default {
getSellers,
removeSeller,
leaveEventAsSeller
};

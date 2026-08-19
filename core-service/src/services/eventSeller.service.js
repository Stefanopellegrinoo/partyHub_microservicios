import eventRepository from "../repositories/eventRepository.js"; 
import { eventSellerRepository } from "../repositories/eventSellerRepository.js"; 

export const eventSellerService = {
  
  async getSellers(partyId, userId) {
    return await eventSellerRepository.findSellersByEvent(partyId);
  },

  async removeSeller(partyId, userId, requesterId) {
    const party = await eventRepository.findEventById(partyId);

    
    if (!party) throw new Error("Fiesta no encontrada");
    
    if (Number(party.organizer_id) !== Number(userId))
      throw new Error("No tenés permiso para eliminar vendedores");
    
    if (Number(userId) === Number(requesterId))
      throw new Error("No podés eliminarte a vos mismo");

    await eventSellerRepository.deleteSeller(partyId, requesterId);
  },

  async abandonEvent(partyId, userId) {
   
    const deleted = await eventSellerRepository.deleteSeller(partyId, userId);
    
    if (!deleted) {
      throw new Error("No estás registrado como vendedor en este evento.");
    }
    return { message: "Has abandonado la fiesta." };
  },
};

export default eventSellerService;
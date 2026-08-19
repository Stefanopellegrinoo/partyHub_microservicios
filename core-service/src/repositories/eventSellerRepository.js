import prisma  from "../config/prisma.js";
import eventRepository from "./eventRepository.js";

export const eventSellerRepository = {
  
  async findSellersByEvent(eventId) {
    return prisma.event_sellers.findMany({
      where: { event_id: parseInt(eventId) },
      select: {
        seller_id: true,
        seller_name: true,
        seller_email: true,
      },
    });
  },

  async deleteSeller(eventId, sellerId) {
   return await prisma.event_sellers.deleteMany({
      where: {
        event_id: parseInt(eventId),
        seller_id: parseInt(sellerId),
      },
    });
  },

  async findEventSeller(eventId, userId) {
    return await prisma.event_sellers.findFirst({
      where: {
        event_id: parseInt(eventId),
        seller_id: parseInt(userId),
      },
      select: { id: true },
    });
  },

  async addSellerToEvent({ event_id, seller_id, seller_name, seller_email }) {
    return prisma.event_sellers.create({
      data: {
        event_id: parseInt(event_id),
        seller_id: parseInt(seller_id),
        seller_name,
        seller_email,
      },
    });
  },

  async sellerAlreadyInEvent(event_id, seller_id) {
    const seller = await prisma.event_sellers.findFirst({
      where: { 
        event_id: parseInt(event_id), 
        seller_id: parseInt(seller_id) 
      },
    });
    return !!seller;
  },

  async getUserEvents(userId) {
    const uId = parseInt(userId);

    // 1. Traer eventos donde soy ORGANIZADOR
    const organizerEvents = await eventRepository.getUserOrganizerEvents(uId);

    // 2. Traer eventos donde soy VENDEDOR (Usando JOIN/Relation)
    // Esto es mucho más eficiente que buscar IDs y luego buscar eventos
    const assignments = await prisma.event_sellers.findMany({
      where: { seller_id: uId },
      include: {
        event: true, // ¡Magia! Trae la info del evento asociado
      },
    });

    // Extraemos el objeto 'event' de la asignación
    const sellerEvents = assignments.map((a) => a.event);

    // 3. Mapeamos roles y unimos
    const organizerEventsMapped = organizerEvents.map((e) => ({
      ...e,
      role: "organizer",
    }));

    const sellerEventsMapped = sellerEvents.map((e) => ({
      ...e,
      role: "seller",
    }));

    return [...organizerEventsMapped, ...sellerEventsMapped];
  },
};

export default eventSellerRepository;
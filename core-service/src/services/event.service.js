import { generateInviteCode } from "../../utils/permissions.js";
import eventRepository from "../repositories/eventRepository.js";
import { eventSellerRepository } from "../repositories/eventSellerRepository.js";
import authClient from "../clients/authClient.js";


const createEvent = async (name, location, date, organizerId) => {
  if (!name) throw new Error("El nombre del evento es obligatorio");

  const inviteCode = generateInviteCode();
  return await eventRepository.createEvent(name, location, date, organizerId, inviteCode);
};

const joinEvent = async (inviteCode, sellerId) => {
  if (!inviteCode) throw new Error("Código de invitación requerido");

  const event = await eventRepository.findByInviteCode(inviteCode);
  if (!event) throw new Error("Código de invitación inválido");

  const alreadyAdded = await eventSellerRepository.sellerAlreadyInEvent(event.id, sellerId);
  if (alreadyAdded) throw new Error("Ya estás registrado como vendedor en este evento");

   const { name, email } = await authClient.getUserById(sellerId);

  await eventSellerRepository.addSellerToEvent({
    event_id: event.id,
    seller_id: sellerId,
    seller_name: name,
    seller_email: email,
  });

  return event.id;
};

const getUserEvents = async (userId) => {
  return await eventSellerRepository.getUserEvents(userId);
};

const getEventDetails = async (eventId) => {
  const event = await eventRepository.findEventById(eventId);
  if (!event){
    throw new Error("Evento no encontrado");
  }
  return event
};


const isOrganizerOfEvent = async (eventId, userId) => {
  const event = await eventRepository.findEventByOrganizer(eventId, userId);
  return !!event;
};

const isSellerOrOrganizerInEvent = async (userId, eventId) => {
  const isOrganizer = await eventRepository.findEventByOrganizer(eventId, userId);
  if (isOrganizer) return true;

  const isSeller = await eventSellerRepository.findEventSeller(eventId, userId);
  return !!isSeller;
};


export default {
  createEvent,
  joinEvent,
  getUserEvents,
  getEventDetails,
  isOrganizerOfEvent,
  isSellerOrOrganizerInEvent
};

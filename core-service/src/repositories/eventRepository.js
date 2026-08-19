import prisma  from "../config/prisma.js";

const createEvent = async (name, location, date, organizerId, inviteCode) => {
  return await prisma.events.create({
    data: {
      name,
      location,
      date: new Date(date),
      organizer_id: organizerId,
      invite_code: inviteCode,
    },
    select: {
      id: true,
      invite_code: true,
    },
  });
};

const findByInviteCode = async (code) => {
  return await prisma.events.findUnique({
    where: { invite_code: code },
    select: { id: true },
  });
};

const findEventById = async (eventId) => {
  return await prisma.events.findUnique({
    where: { id: parseInt(eventId) },
    // Opcional: include: { tandas: true } si quieres ver las tandas de una
  });
};

const findEventByOrganizer = async (eventId, userId) => {
  return await prisma.events.findFirst({
    where: {
      id: parseInt(eventId),
      organizer_id: parseInt(userId),
    },
    select: { id: true },
  });
};

const getUserOrganizerEvents = async (userId) => {
  return await prisma.events.findMany({
    where: { organizer_id: parseInt(userId) },
    select: {
      id: true,
      name: true,
      location: true,
      date: true,
      invite_code: true,
    },
    orderBy: { date: 'desc' }
  });
};

export default {
  createEvent,
  findByInviteCode,
  findEventById,
  findEventByOrganizer,
  getUserOrganizerEvents,
};
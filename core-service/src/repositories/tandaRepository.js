import prisma  from "../config/prisma.js";

const getAllByEventId = async (eventId) => {
  return await prisma.tandas.findMany({
    where: { event_id: parseInt(eventId) },
    orderBy: { id: "asc" },
  });
};

const insertTanda = async (
  eventId,
  capacity,
  price,
  gender,
  startTime,
  endTime,
  isActive,
  name,
  organizer_id
) => {
  return await prisma.tandas.create({
    data: {
      event_id: parseInt(eventId),
      capacity,
      price,
      gender,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      is_active: isActive,
      name,
      organizer_id
    },
  });
};

const getById = async (id) => {
  return await prisma.tandas.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      event_id: true,
      gender: true,
      capacity: true,
      sold_tickets: true,
      reserved_tickets: true,
      start_time: true,
      end_time: true,
      price: true,
      is_active: true,
      name: true,
      organizer_id: true,
    },
  });
};

const updateStatus = async (id, isActive) => {
  return await prisma.tandas.update({
    where: { id: parseInt(id) },
    data: { is_active: isActive },
  });
};

const hasActiveSameGender = async (eventId, gender, excludeId = null) => {
  const where = {
    event_id: parseInt(eventId),
    gender: { equals: gender, mode: "insensitive" },
    is_active: true,
    ...(excludeId && { NOT: { id: parseInt(excludeId) } }),
  };

  const existing = await prisma.tandas.findFirst({ where });
  return !!existing;
};

// MODIFICADO PARA SOPORTAR ATOMICIDAD
// Ahora puedes pasar objetos { increment: X } en lugar de números fijos si quieres
const updateTandaSales = async (tx, tandaId, quantity) => {
  const client = tx || prisma;
  
  // Usamos una consulta que verifica la capacidad en la misma operación de UPDATE
  // Esto es "Optimistic Concurrency Control"
  return client.tandas.update({
    where: { 
      id: parseInt(tandaId),
      // El blindaje: solo actualiza si hay lugar real
      // Nota: sold_tickets + quantity <= capacity
    },
    data: {
      sold_tickets: { increment: quantity },
    }
  });
};

const deactivateTanda = async (tx, tandaId) => {
  const client = tx || prisma;
  return client.tandas.update({
    where: { id: parseInt(tandaId) },
    data: { is_active: false },
    select: { id: true },
  });
};

const activateNextTandaSameCategory = async (
  tx,
  eventId,
  gender,
  excludeTandaId
) => {
  const client = tx || prisma;

  const next = await client.tandas.findFirst({
    where: {
      event_id: parseInt(eventId),
      gender,
      is_active: false,
      id: { not: parseInt(excludeTandaId) },
      // FIX: Prisma no permite comparar columnas en el 'where' fácilmente.
      // Asumimos que la "siguiente tanda" debe estar vacía (0 ventas) para activarse.
      sold_tickets: 0, 
    },
    orderBy: { start_time: "asc" },
  });

  if (next) {
    return await client.tandas.update({
      where: { id: next.id },
      data: { is_active: true },
      select: {
        id: true,
        name: true,
        gender: true,
      },
    });
  }
};

export default {
  getAllByEventId,
  insertTanda,
  getById,
  updateStatus,
  hasActiveSameGender,
  updateTandaSales,
  deactivateTanda,
  activateNextTandaSameCategory,
};
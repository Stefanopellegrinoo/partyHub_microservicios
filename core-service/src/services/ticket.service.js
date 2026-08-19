import redis from "../config/redis.js";
import ticketRepository from "../repositories/ticketRepository.js";
import tandaRepository from "../repositories/tandaRepository.js";
import { randomUUID } from "crypto";
import { publishEvent } from "../../utils/eventBus.js";
import prisma from "../config/prisma.js";
import eventService from "./event.service.js";

const RESERVATION_TIME_SECONDS = 300;

// --- HELPER DE BÚSQUEDA ---
const findSellerReservationKey = async (partyId, tandaId, sellerId) => {
  const pattern = `reservation:${partyId}:${tandaId}:${sellerId}:qty:*`;
  let cursor = "0";
  
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) return keys[0];
  } while (cursor !== "0");

  return null;
};

// --- RESERVAR ---
const reserveTickets = async (tandaId, quantity, sellerId, partyId, io) => {
  const nTanda = Number(tandaId);
  const nParty = Number(partyId);

  // 1. Validaciones
  const isAuthorized = await eventService.isSellerOrOrganizerInEvent(sellerId, nParty);
  if (!isAuthorized) throw new Error("No tienes permiso");

  const tanda = await tandaRepository.getById(nTanda);  if (!tanda) throw new Error("Tanda no encontrada");

  // 2. Claves
  const stockKey = `tanda:${tandaId}:stock`;
  const lockKey = `lock:reservation:${partyId}:${sellerId}`; 
  const reservationKey = `reservation:${partyId}:${tandaId}:${sellerId}:qty:${quantity}`;

  // 3. Chequeo preventivo (Opcional pero recomendado para UX)
  // Busca si ya tiene reserva en ESTA tanda específica antes de intentar bloquear
  const existingKey = await findSellerReservationKey(partyId, tandaId, sellerId);
  if (existingKey) {
     throw new Error("Ya tenés una reserva activa. Confirmala o cancelala.");
  }

  // 4. CANDADO ATÓMICO (SETNX)
  const acquiredLock = await redis.set(lockKey, "LOCKED", "NX", "EX", RESERVATION_TIME_SECONDS);

  if (!acquiredLock) {
    throw new Error("Ya tenés una reserva activa (o en proceso). No podés reservar más.");
  }

  try {
    // 5. Inicialización Lazy Stock
    const stockExists = await redis.exists(stockKey);
    if (!stockExists) {
      const realStock = Math.max(0, tanda.capacity - tanda.sold_tickets);
      await redis.set(stockKey, realStock);
    }

    // 6. Descuento Atómico
    const newStock = await redis.decrby(stockKey, quantity);

    if (newStock < 0) {
      await redis.incrby(stockKey, quantity); // Rollback
      throw new Error("No hay suficientes boletos disponibles");
    }

    try {
      // 7. Guardar Reserva y Candado (Ya el candado se puso antes con NX, lo refrescamos con el TTL correcto)
      await redis.set(reservationKey, "ACTIVE", "EX", RESERVATION_TIME_SECONDS);

      // 8. Notificar
      io.to(`party:${partyId}`).emit("ticket-reserved", {
        batchId: nTanda,
        quantity,
        remainingStock: newStock
      });

      return new Date(Date.now() + RESERVATION_TIME_SECONDS * 1000).toISOString();
    } catch (redisError) {
      // Si falla Redis al guardar la reserva, devolvemos stock
      await redis.incrby(stockKey, quantity);
      throw new Error("Error interno al procesar la reserva. Stock restaurado.");
    }

  } catch (error) {
    // Si falló por stock u otro error, liberamos el candado para que pueda intentar de nuevo
    await redis.del(lockKey); 
    throw error;
  }
};

// --- CONFIRMAR COMPRA ---
const confirmPurchase = async (tandaId, sellerId, partyId, attendees) => {
  const nTanda = Number(tandaId);
  const nParty = Number(partyId);

  // 1. Buscar la reserva
  const pattern = `reservation:${partyId}:${tandaId}:${sellerId}:qty:*`;
  let cursor = "0";
  let reservationKey = null;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      reservationKey = keys[0];
      break;
    }
  } while (cursor !== "0");

  if (!reservationKey) {
    throw new Error("La reserva ha expirado o no existe.");
  }

  const parts = reservationKey.split(":qty:");
  const quantity = parseInt(parts[1]);

  if (!quantity || quantity <= 0) {
    throw new Error("Cantidad de reserva inválida.");
  }

  // 2. Validaciones SQL
  const [tanda, isAuthorized] = await Promise.all([
    tandaRepository.getById(nTanda),
    eventService.isSellerOrOrganizerInEvent(sellerId, nParty),
  ]);

  if (!tanda) throw new Error("Tanda no encontrada");
  if (!isAuthorized) throw new Error("No tienes permiso para confirmar compras");

  // 3. Transacción SQL con Bloqueo de Fila
  try {
    await prisma.$transaction(async (tx) => {
      // BLOQUEO DE FILA: Nadie más puede modificar esta tanda hasta que termine esta transacción
      const tandaActual = await tx.$queryRaw`
        SELECT * FROM tandas 
        WHERE id = ${nTanda} 
        FOR UPDATE
      `;

      if (!tandaActual || tandaActual.length === 0) {
        throw new Error("La tanda desapareció durante el proceso.");
      }

      const t = tandaActual[0];
      const available = t.capacity - t.sold_tickets;

      if (quantity > available) {
        throw new Error(`Sobreventa detectada: Solo quedan ${available} lugares y pediste ${quantity}.`);
      }

      // Proceder con la venta
      await ticketRepository.insertSale(tx, nTanda, sellerId, quantity);

      const updatedTanda = await tx.tandas.update({
        where: { id: nTanda },
        data: {
          sold_tickets: { increment: quantity },
        },
      });

      // Lógica de Stock Agotado
      if (updatedTanda.sold_tickets >= updatedTanda.capacity) {
        await tandaRepository.deactivateTanda(tx, nTanda);
        const newBatch = await tandaRepository.activateNextTandaSameCategory(tx, nParty, t.gender, nTanda);
        
        await publishEvent("tanda:out-of-stock", {
          tandaId: nTanda,
          partyId: nParty,
          organizerId: t.organizer_id,
          batchName: t.name,
          newBatchId: newBatch?.id || null,
        });
      }
    }, {
      isolationLevel: 'Serializable', // Máximo nivel de protección
    });
  } catch (err) {
    // Si falla la DB, debemos devolver el stock a Redis
    const stockKey = `tanda:${nTanda}:stock`;
    await redis.incrby(stockKey, quantity);
    throw err;
  }

  // 4. LIMPIEZA DE REDIS (Aquí corregimos los duplicados)
  await redis.del(reservationKey); // Borra la reserva
  await redis.del(`lock:reservation:${partyId}:${sellerId}`); // Borra el candado
  await redis.del(`tandas:event:${partyId}`); // Borra caché de lista si existe

  // 5. Notificar
  const newAttendees = attendees.map((att) => ({
    id: randomUUID(),
    fullName: att.fullName,
    email: att.email,
    documentId: att.documentId,
    phone: att.phone,
    paid: att.paid,
  }));

  try {
    await publishEvent("tickets.confirmed", {
      newAttendees,
      tandaId,
      sellerId,
      eventId: partyId,
      tandaName: tanda.name,
      tandaPrice: Number(tanda.price),
      uuid: randomUUID(),
    });
  } catch (err) {
    console.error("❌ Error al publicar evento de asistentes:", err.message);
  }

  return "Compra confirmada";
};

// --- CANCELAR RESERVA ---
const cancelReservation = async (eventId, tandaId, sellerId, io) => {
  // 1. Buscar Key
  const reservationKey = await findSellerReservationKey(eventId, tandaId, sellerId);
  
  if (!reservationKey) throw new Error("No hay reserva activa para cancelar");

  const quantity = parseInt(reservationKey.split(":qty:")[1]);

  // 2. Borrar Key de Reserva
  await redis.del(reservationKey);

  // 3. Devolver Stock
  const stockKey = `tanda:${tandaId}:stock`;
  const newStock = await redis.incrby(stockKey, quantity);
  
  // 4. Borrar Candado (CORREGIDO: Usamos eventId, no partyId que no existe aquí)
  await redis.del(`lock:reservation:${eventId}:${sellerId}`); 

  // 5. Notificar
  io.to(`party:${eventId}`).emit("reservation-cancelled", {
    batchId: Number(tandaId),
    quantity: quantity,
    remainingStock: newStock 
  });

  return "Reserva cancelada y boletos liberados.";
};

// --- OBTENER RESERVA ACTUAL ---
const getReservation = async (partyId, sellerId) => {
  const pattern = `reservation:${partyId}:*:${sellerId}:qty:*`;
  
  let cursor = "0";
  let foundKey = null;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      foundKey = keys[0]; 
      break;
    }
  } while (cursor !== "0"); 
  
  if (!foundKey) return null;

  const parts = foundKey.split(":");
  const tandaId = parts[2];
  const quantity = parseInt(parts[5]);

  const ttl = await redis.ttl(foundKey);
  
  if (ttl <= 0) {
    await redis.del(foundKey);
    return null;
  }

  return {
    hasReservation: true,
    tanda_id: parseInt(tandaId),
    quantity: quantity,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  };
};

// --- GESTIÓN DE POOL DE CANCELACIONES ---
const getCanceledPool = async (eventId) => {
  return await prisma.canceled_tickets.findMany({
    where: { event_id: Number(eventId) },
    orderBy: { canceled_at: "desc" }
  });
};

const injectPooledTicket = async (poolTicketId, eventId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Buscar el ticket en el pool
    const poolTicket = await tx.canceled_tickets.findUnique({
      where: { id: Number(poolTicketId) }
    });

    if (!poolTicket) throw new Error("Ticket no encontrado en el pool.");

    // 2. Buscar la tanda activa actual para ese evento
    const activeTanda = await tx.tandas.findFirst({
      where: {
        event_id: Number(eventId),
        is_active: true
      }
    });

    if (!activeTanda) throw new Error("No hay una tanda activa para recibir el cupo.");

    // 3. Aumentar CAPACIDAD de la tanda activa
    await tx.tandas.update({
      where: { id: activeTanda.id },
      data: { capacity: { increment: 1 } }
    });

    // 4. Sincronizar Redis para la tanda activa
    const stockKey = `tanda:${activeTanda.id}:stock`;
    if (await redis.exists(stockKey)) {
      await redis.incr(stockKey);
    }

    // 5. Borrar del pool
    await tx.canceled_tickets.delete({
      where: { id: poolTicket.id }
    });

    return { 
      message: `Cupo de ${poolTicket.attendee_name} inyectado exitosamente en ${activeTanda.name}`,
      tandaId: activeTanda.id
    };
  });
};

export default {
  reserveTickets,
  confirmPurchase,
  cancelReservation,
  getReservation,
  getCanceledPool,
  injectPooledTicket
};
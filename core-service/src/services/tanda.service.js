import { redis } from "../config/redis.js"; // Usamos la instancia general
import tandaRepository from "../repositories/tandaRepository.js"; // Nombre corregido

const getTandasByEvent = async (eventId) => {
  const tandas = await tandaRepository.getAllByEventId(eventId);

  const result = await Promise.all(tandas.map(async (tanda) => {
    const stockKey = `tanda:${tanda.id}:stock`;
    
    // Obtenemos stock directo de Redis
    let currentStock = await redis.get(stockKey);

    // Lazy Initialization: Si Redis no tiene el dato, lo calculamos y guardamos
    if (currentStock === null) {
      const calculated = tanda.capacity - tanda.sold_tickets;
      currentStock = Math.max(0, calculated);
      
      await redis.set(stockKey, currentStock);
    }

    return {
      ...tanda,
      available_stock: Number(currentStock) 
    };
  }));

  return result;
};

const createTanda = async (eventId, userId, { name, quantity, price, category, startDate, endDate }) => {
  // Validamos si ya hay una activa del mismo género
  const hasActive = await tandaRepository.hasActiveSameGender(eventId, category);
  const isActive = !hasActive; // Si no hay activa, esta nace activa

  const result = await tandaRepository.insertTanda(
    eventId,
    quantity,
    price,
    category,
    startDate,
    endDate,
    isActive,
    name,
    userId
  );
  
  // Inicializamos el stock en Redis inmediatamente
  const tandaId = result.id;
  await redis.set(`tanda:${tandaId}:stock`, quantity);

  return result;
};

const toggleTanda = async (batchId, partyId, userId, io) => {
  const tanda = await tandaRepository.getById(batchId);
  if (!tanda) throw new Error("Tanda no encontrada");

  // Si vamos a ACTIVAR, verificar que no choque con otra del mismo género
  if (!tanda.is_active) {
    const conflict = await tandaRepository.hasActiveSameGender(tanda.event_id, tanda.gender, tanda.id);
    if (conflict) throw new Error(`Ya hay una tanda activa para el género ${tanda.gender}`);
    
    // BLINDAJE: Sincronizar stock en Redis con la realidad de la DB antes de activar
    const realStock = Math.max(0, tanda.capacity - tanda.sold_tickets);
    await redis.set(`tanda:${tanda.id}:stock`, realStock);
  }

  const newStatus = !tanda.is_active;
  await tandaRepository.updateStatus(tanda.id, newStatus);

  // Notificamos a los clientes en tiempo real
  // 'io' viene inyectado desde el controller
  io.to(`party:${partyId}`).emit("tanda-status-updated", {
    batchId,
    newStatus,
  });

  return newStatus;
};

export default {
  getTandasByEvent,
  createTanda,
  toggleTanda,
};
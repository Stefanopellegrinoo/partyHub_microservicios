import { redis, redisPubSub } from "../src/config/redis.js";

const handlers = new Map();

// Único listener global de "message"
redisPubSub.on("message", async (channel, message) => {
  const eventHandlers = handlers.get(channel);
  if (!eventHandlers) return;

  try {
    let payload;
    try {
      payload = JSON.parse(message);
    } catch {
      // Si no es JSON (ej. expiración de Redis), pasamos el string plano
      payload = message;
    }
    
    
    // Ejecutar todos los handlers registrados para este canal
    for (const handler of eventHandlers) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`❌ [EventBus] Error en handler para ${channel}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`❌ [EventBus] Error crítico procesando canal ${channel}:`, err.message);
  }
});

export const subscribeToEvent = (eventName, handler) => {
  // 1. Registrar el handler internamente
  if (!handlers.has(eventName)) {
    handlers.set(eventName, []);
    
    // 2. Suscribirse físicamente en Redis solo la primera vez para este evento
    redisPubSub.subscribe(eventName, (err) => {
      if (err) {
        console.error(`❌ [EventBus] Error al suscribirse a ${eventName}:`, err.message);
      } else {
      }
    });
  }

  handlers.get(eventName).push(handler);
};

export const publishEvent = async (event, payload) => {
  try {
    const message = JSON.stringify(payload);
    await redis.publish(event, message);
  } catch (err) {
    console.error(`❌ [EventBus] Error al publicar evento ${event}:`, err.message);
    throw err;
  }
};

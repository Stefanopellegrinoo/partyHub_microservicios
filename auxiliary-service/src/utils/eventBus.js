import { redisPublisher, redisSubscriber } from "../config/redis.js";

export const subscribeToEvent = (eventName, handler) => {
  redisSubscriber.subscribe(eventName, (err) => {
    if (err) {
      console.error(`❌ Error al suscribirse a ${eventName}:`, err.message);
    } else {
    }
  });

  redisSubscriber.on("message", async (channel, message) => {
    if (channel === eventName) {
      try {
        const payload = JSON.parse(message);
        await handler(payload);
      } catch (err) {
        console.error(`❌ Error al procesar ${eventName}:`, err.message);
      }
    }
  });

};

export const publishEvent = async (event, payload) => {
  try {
    const message = JSON.stringify(payload);
    await redisPublisher.publish(event, message);
  } catch (err) {
    console.error(`❌ [EventBus] Error al publicar evento ${event}:`, err.message);
    throw err;
  }
};


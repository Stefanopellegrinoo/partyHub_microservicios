import IORedis from "ioredis";

export const redisSubscriber = new IORedis(process.env.REDIS_URL);
export const redisPublisher = new IORedis(process.env.REDIS_URL); // si querés emitir eventos en este servicio también

export const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // 🔴 esto es obligatorio para BullMQ
});

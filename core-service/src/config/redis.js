import { Redis } from "ioredis";

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      maxRetriesPerRequest: null,
    });


export const redisPubSub = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });

redis.on("error", (err) => console.error("❌ Redis error", err));
redisPubSub.on("error", (err) => console.error("❌ redisPubSub error", err));

redis.config("SET", "notify-keyspace-events", "Ex").then(() => {
});

export default redis;

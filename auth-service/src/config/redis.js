import Redis from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on("error", (err) => console.error("❌ Redis Auth Error:", err));

export default redisClient;
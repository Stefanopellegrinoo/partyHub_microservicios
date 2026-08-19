import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js"; 

export const qrQueue = new Queue("qrQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // Los QR pueden reintentarse un poco más rápido
    },
    removeOnComplete: true,
  },
});

import { Worker } from "bullmq";
import { sendMail } from "../utils/mail-engine.js"; // 👈 Unificado
import { redisConnection } from "../config/redis.js";

const QUEUE_NAME = "mailSend";

export const initMailWorker = () => {

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { to, subject, html, attachments } = job.data;
      

      try {
        await sendMail({ to, subject, html, attachments });
      } catch (error) {
        console.error(`❌ Error enviando mail a ${to}:`, error.message);
        throw error; 
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  return worker;
};

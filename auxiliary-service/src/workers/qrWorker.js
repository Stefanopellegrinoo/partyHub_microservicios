import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { generateQRBase64 } from "../utils/qr.js";
import { getTicketEmailTemplate } from "../utils/mail-engine.js"; // 👈 Unificado
import { mailQueue } from "../queues/mailQueue.js"; 

const QUEUE_NAME = "qrQueue";

export const initQrWorker = () => {

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const attendee = job.data;

      try {
        const qr = await generateQRBase64(attendee.ticket_code);
        const qrBase64 = qr.replace(/^data:image\/png;base64,/, "");
        
        // Usamos el template del engine unificado
        const html = getTicketEmailTemplate(attendee, attendee.party_name || "Tu evento");

        await mailQueue.add("send-ticket", {
          to: attendee.email,
          subject: `🎟 TU ENTRADA: ${attendee.party_name?.toUpperCase() || "EVENTO"}`,
          html,
          attachments: [
            {
              filename: "access_code.png",
              content: qrBase64,
              encoding: "base64",
              cid: "qrimage",
            },
          ],
        }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 }
        });


      } catch (error) {
        console.error(`❌ Error en QR Worker para ${attendee.email}:`, error.message);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  return worker;
};

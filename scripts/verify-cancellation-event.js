import { Redis } from "ioredis";

const redis = new Redis({
  host: "localhost", // Asumiendo que el puerto 6379 está expuesto
  port: 6379
});

const testPayload = {
  eventId: 1,
  tandaId: 1,
  attendeeName: "Test SDD",
  price: 1500
};

console.log("🚀 Publicando evento de prueba 'ticket.canceled'...");
redis.publish("ticket.canceled", JSON.stringify(testPayload))
  .then(() => {
    console.log("✅ Evento publicado. Revisa los logs del core-service.");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Error publicando:", err.message);
    process.exit(1);
  });

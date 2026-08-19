const axios = require("axios");

/**
 * 🔥 CONFIGURACIÓN DEL ATAQUE 🔥
 * Podés completar estos datos o pasarlos por terminal así:
 * PARTY_ID=1 TANDA_ID=5 TOKEN=... node scripts/stress-test.js
 */
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3055";
const PARTY_ID = process.env.PARTY_ID || "PONÉ_ACA_TU_PARTY_ID";
const TANDA_ID = process.env.TANDA_ID || "PONÉ_ACA_TU_TANDA_ID";
const TOKEN = process.env.TOKEN || "PONÉ_ACA_TU_ACCESS_TOKEN";

const TOTAL_REQUESTS = 100; // Peticiones a enviar
const BATCH_SIZE = 10;     // De a cuántas en simultáneo

async function attack() {
  if (PARTY_ID.includes("PONÉ")) {
    console.log("❌ Error: Tenés que configurar el PARTY_ID, TANDA_ID y TOKEN en el script o por variables de entorno.");
    process.exit(1);
  }

  console.log(`\n🚀 LANZANDO ATAQUE SOBRE PARTY ${PARTY_ID} | TANDA ${TANDA_ID}`);
  console.log(`🌊 Enviando ${TOTAL_REQUESTS} peticiones en tandas de ${BATCH_SIZE}...\n`);

  let successCount = 0;
  let failCount = 0;
  const errorStats = {};

  for (let i = 0; i < TOTAL_REQUESTS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_REQUESTS; j++) {
      batch.push(
        axios.post(
          `${GATEWAY_URL}/tickets/parties/${PARTY_ID}/batches/${TANDA_ID}/reserve`,
          { quantity: 1 },
          { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 5000 }
        )
        .then(() => { successCount++; })
        .catch((err) => {
          failCount++;
          const msg = err.response?.data?.error || err.message;
          errorStats[msg] = (errorStats[msg] || 0) + 1;
        })
      );
    }
    await Promise.all(batch);
    process.stdout.write(".");
  }

  console.log("\n\n=============================================");
  console.log("📊 REPORTE DE TU PRUEBA");
  console.log("=============================================");
  console.log(`✅ Reservas ganadas:  ${successCount}`);
  console.log(`❌ Reservas fallidas: ${failCount}`);
  console.log("=============================================");
  console.log("📉 DESGLOSE DE ERRORES:");
  console.table(errorStats);
  
  console.log("\n💡 NOTA: Si usaste un solo token, es normal que solo 1 sea éxito y el resto falle con");
  console.log("'ya tiene una reserva activa'. Para probar sobreventa real, usá el massive-simulation.js");
  console.log("con el bypass en el core-service.");
}

attack();

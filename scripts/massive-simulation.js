const axios = require("axios");

/**
 * 🌍 SIMULACIÓN MASIVA PROFESIONAL (Real-World Flow) 🌍
 * Este script NO requiere modificar el código del backend.
 * Simula usuarios reales registrándose, uniéndose a la fiesta y reservando.
 */

const GATEWAY_URL = "http://localhost:3055";

// CONFIGURACIÓN (Completá estos 2 datos con lo que ves en la web)
const INVITE_CODE = process.env.INVITE_CODE || "TU_CODIGO_DE_INVITACION";
const TANDA_ID = process.env.TANDA_ID || "TU_TANDA_ID";

const TOTAL_BOTS = 50; // Cantidad de usuarios reales a crear (no te pases para no saturar tu DB)
const BATCH_SIZE = 5;  // De a cuántos bots procesamos en paralelo

async function simulateUser(index) {
  const ts = Date.now();
  const email = `bot_${index}_${ts}@test.com`;
  const password = "Password123";

  try {
    // 1. Registro Real
    await axios.post(`${GATEWAY_URL}/auth/register`, {
      name: `Bot User ${index}`,
      email: email,
      password: password
    });

    // 2. Login Real
    const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: email,
      password: password
    });
    const token = loginRes.data.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Unirse a la Fiesta (Se convierte en vendedor oficial)
    const joinRes = await axios.post(`${GATEWAY_URL}/parties/join`, {
      code: INVITE_CODE
    }, authHeader);
    
    // El endpoint devuelve directamente el ID del evento (number)
    const partyId = joinRes.data; 

    if (!partyId) throw new Error("No se pudo obtener el partyId del join");

    // 4. Reservar Entrada
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${TANDA_ID}/reserve`, {
      quantity: 1
    }, authHeader);

    return { status: "✅", email };
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    return { status: "❌", msg, email };
  }
}

async function run() {
  if (INVITE_CODE.includes("TU_CODIGO")) {
    console.log("❌ Error: Necesito el INVITE_CODE de la fiesta (lo ves en el dashboard).");
    process.exit(1);
  }

  console.log(`\n🚀 INICIANDO SIMULACIÓN DE ${TOTAL_BOTS} USUARIOS REALES`);
  console.log(`🎯 Fiesta: ${INVITE_CODE} | Tanda: ${TANDA_ID}\n`);

  const startTime = Date.now();
  let results = [];

  for (let i = 0; i < TOTAL_BOTS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_BOTS; j++) {
      batch.push(simulateUser(i + j));
    }
    const batchResults = await Promise.all(batch);
    results = [...results, ...batchResults];
    process.stdout.write(".");
  }

  const endTime = Date.now();
  const success = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌");

  console.log("\n\n=============================================");
  console.log(`⏱️  Tiempo: ${(endTime - startTime) / 1000}s`);
  console.log(`✅ Reservas exitosas: ${success}`);
  console.log(`❌ Fallidas:          ${failed.length}`);
  console.log("=============================================");

  if (failed.length > 0) {
    console.log("📉 Detalle de errores:");
    const stats = {};
    failed.forEach(f => stats[f.msg] = (stats[f.msg] || 0) + 1);
    console.table(stats);
  }
}

run();

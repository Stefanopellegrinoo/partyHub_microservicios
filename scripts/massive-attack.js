const axios = require("axios");

/**
 * 🏆 MASIVE ATTACK: MODO FINAL DEL MUNDO 🏆
 * 1000 BOTS REALES COMPITIENDO AL MISMO MILISEGUNDO.
 */

const GATEWAY_URL = "http://localhost:3055";

// CONFIGURACIÓN PICANTE
const INVITE_CODE = process.env.INVITE_CODE || "TU_CODIGO";
const TANDA_ID = process.env.TANDA_ID || "TU_ID";
const TOTAL_BOTS = 1000; 
const PREP_CONCURRENCY = 15; // Registramos de a 15 bots en paralelo para ir rápido

async function prepareBot(index) {
  const ts = Date.now();
  const email = `worldcup_bot_${index}_${ts}@test.com`;
  const password = "Password123";
  let step = "INICIO";

  try {
    const api = axios.create({ baseURL: GATEWAY_URL, timeout: 30000 });

    step = "REGISTRO";
    await api.post(`/auth/register`, { name: `Messi Bot ${index}`, email, password });

    step = "LOGIN";
    const loginRes = await api.post(`/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    step = "JOIN";
    const joinRes = await api.post(`/parties/join`, { code: INVITE_CODE }, authHeader);
    const partyId = joinRes.data;

    return { authHeader, partyId, tandaId: TANDA_ID };
  } catch (err) {
    // Solo logueamos errores críticos para no ensuciar la terminal
    return null;
  }
}

async function run() {
  if (INVITE_CODE.includes("TU_CODIGO")) {
    console.log("❌ Error: Pasame el INVITE_CODE.");
    process.exit(1);
  }

  console.log(`\n🇦🇷  INICIANDO PREPARACIÓN DE 1000 BOTS (Calentamiento masivo)...`);
  const botConfigs = [];

  for (let i = 0; i < TOTAL_BOTS; i += PREP_CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < PREP_CONCURRENCY && (i + j) < TOTAL_BOTS; j++) {
      batch.push(prepareBot(i + j));
    }
    const ready = await Promise.all(batch);
    botConfigs.push(...ready.filter(b => b !== null));
    
    const progress = Math.round((botConfigs.length / TOTAL_BOTS) * 100);
    process.stdout.write(`\rProgreso: ${progress}% [${botConfigs.length}/${TOTAL_BOTS} bots listos]`);
  }

  console.log(`\n\n🔥 EL ESTADIO ESTÁ LLENO: ${botConfigs.length} bots listos.`);
  console.log(`⚠️  CONSEJO: Bajá el stock de la tanda 109 a 100 entradas AHORA.`);
  console.log(`🚀 LANZANDO EL BIG BANG EN 3... 2... 1...`);

  await new Promise(r => setTimeout(r, 2000));

  const attackStartTime = Date.now();
  
  // LANZAMIENTO MASIVO (Sincronización Total)
  const attackPromises = botConfigs.map(config => 
    axios.post(`${GATEWAY_URL}/tickets/parties/${config.partyId}/batches/${config.tandaId}/reserve`, 
      { quantity: 1 }, 
      config.authHeader
    )
    .then(() => ({ status: "✅" }))
    .catch(err => ({ status: "❌", msg: err.response?.data?.error || "Error de Red" }))
  );

  const results = await Promise.all(attackPromises);
  const attackEndTime = Date.now();

  const success = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌");

  console.log("\n\n=============================================");
  console.log("📊 RESULTADO DEL IMPACTO MASIVO");
  console.log("=============================================");
  console.log(`⏱️  Duración del ataque: ${(attackEndTime - attackStartTime)}ms`);
  console.log(`💎 GANADORES (Tickets):  ${success}`);
  console.log(`🛡️  REBOTADOS (Sin cupo): ${failed.length}`);
  console.log("=============================================");

  if (failed.length > 0) {
    const stats = {};
    failed.forEach(f => stats[f.msg] = (stats[f.msg] || 0) + 1);
    console.log("📉 Desglose de rechazos:");
    console.table(stats);
  }

  console.log("\n🚩 VERIFICACIÓN DE ORO:");
  console.log(`Si el stock era 100, GANADORES debe ser EXACTAMENTE 100.`);
  console.log(`Si hay 101, tenemos un problema de arquitectura grave.`);
}

run();

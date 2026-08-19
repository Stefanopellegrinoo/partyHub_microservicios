const axios = require("axios");
const jwt = require("jsonwebtoken");

/**
 * ⚡ BLITZ ATTACK: MODO USUARIOS REALES ⚡
 * Firma tokens para usuarios existentes y ataca al mismo milisegundo.
 */

const GATEWAY_URL = "http://localhost:3055";
const JWT_SECRET = "accesstokensecret"; // Sacado de auth-service/.env

// CONFIGURACIÓN
const PARTY_ID = process.env.PARTY_ID || "59";
const TANDA_ID = process.env.TANDA_ID || "109";
const START_ID = parseInt(process.env.START_ID) || 1;
const END_ID = parseInt(process.env.END_ID) || 1300;

async function run() {
  console.log(`\n🎟️  PREPARANDO ATAQUE RELÁMPAGO`);
  console.log(`🎯 Objetivo: Party ${PARTY_ID} | Tanda ${TANDA_ID}`);
  console.log(`👥 Usuarios: Del ID ${START_ID} al ${END_ID}\n`);

  const botConfigs = [];
  
  // 1. Generar tokens instantáneamente (Sin pegarle a la DB ni Bcrypt)
  for (let id = START_ID; id <= END_ID; id++) {
    const token = jwt.sign({ id: id }, JWT_SECRET, { expiresIn: "1h" });
    botConfigs.push({
      authHeader: { headers: { Authorization: `Bearer ${token}` } },
      partyId: PARTY_ID,
      tandaId: TANDA_ID,
      id
    });
  }

  console.log(`🔥 ${botConfigs.length} Tokens reales firmados. ¡LANZANDO EL IMPACTO!`);
  console.log(`🚀 Sincronizando peticiones...`);

  const attackStartTime = Date.now();
  
  // LANZAMIENTO MASIVO SINCRONIZADO
  const attackPromises = botConfigs.map(config => 
    axios.post(`${GATEWAY_URL}/tickets/parties/${config.partyId}/batches/${config.tandaId}/reserve`, 
      { quantity: 1 }, 
      config.authHeader
    )
    .then(() => ({ status: "✅" }))
    .catch(err => ({ status: "❌", msg: err.response?.data?.error || "Error" }))
  );

  const results = await Promise.all(attackPromises);
  const attackEndTime = Date.now();

  const success = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌");

  console.log("\n=============================================");
  console.log(`⏱️  Duración del impacto: ${(attackEndTime - attackStartTime)}ms`);
  console.log(`💎 GANADORES (Tickets):  ${success}`);
  console.log(`🛡️  REBOTADOS (Sin cupo): ${failed.length}`);
  console.log("=============================================");

  if (failed.length > 0) {
    const stats = {};
    failed.forEach(f => stats[f.msg] = (stats[f.msg] || 0) + 1);
    console.table(stats);
  }

  console.log("\n💡 VERIFICACIÓN:");
  console.log(`Si tenías 200 de stock, GANADORES debe ser EXACTAMENTE 200.`);
}

run();

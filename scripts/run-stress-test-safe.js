const axios = require("axios");

const GATEWAY_URL = "http://localhost:3055";
let token = "";
let partyId = "";
let tandaId = "";
const BATCH_SIZE = 100;
const TOTAL_REQUESTS = 1000;

async function setup() {
  console.log("🛠️  Configurando entorno para prueba de estrés...");
  // 1. Registro temporal
  const ts = Date.now();
  const userRes = await axios.post(`${GATEWAY_URL}/auth/register`, {
    firstName: "Stress", lastName: "Tester",
    email: `stress${ts}@test.com`, password: "Password123"
  });
  token = userRes.data.token;
  
  // 2. Crear Evento
  const partyRes = await axios.post(`${GATEWAY_URL}/parties`, {
    name: "Stress Party", date: new Date(Date.now() + 86400000).toISOString(),
    location: "Test Location", description: "Stress test event"
  }, { headers: { Authorization: `Bearer ${token}` } });
  partyId = partyRes.data.id;

  // 3. Crear Tanda con stock exacto de 500
  const tandaRes = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
    name: "Stress Batch", quantity: 500, price: 1000, category: "unisex",
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(),
    is_active: true
  }, { headers: { Authorization: `Bearer ${token}` } });
  tandaId = tandaRes.data.id;
  console.log(`✅ Entorno listo: Party ${partyId}, Tanda ${tandaId} (Stock 500)`);
}

async function attack() {
  console.log(`\n🚀 INICIANDO STRESS TEST`);
  let successCount = 0;
  let failCount = 0;
  const requests = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const req = axios.post(
      `${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/reserve`,
      { quantity: 1 },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    )
    .then(() => { successCount++; })
    .catch(() => { failCount++; });
    requests.push(req);
  }

  await Promise.all(requests);

  console.log("📊 REPORTE DE STRESS TEST:");
  console.log(`Peticiones (Usuarios): ${TOTAL_REQUESTS}`);
  console.log(`Reservas Exitosas: ${successCount}`);
  console.log(`Reservas Fallidas: ${failCount}`);
  
  if (successCount === 500) {
    console.log("✅ PERFECTO: El candado de base de datos impidió sobreventa. Solo se vendió el stock exacto (500).");
  } else if (successCount > 500) {
    console.log("❌ PELIGRO (RACE CONDITION): Se sobrevendió el stock.");
  } else {
    console.log("⚠️ AVISO: No se agotó el stock o hubo errores de red masivos.");
  }
}

async function run() {
  await setup();
  await attack();
}
run();

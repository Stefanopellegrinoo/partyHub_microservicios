const axios = require("axios");
const jwt = require("jsonwebtoken");

// ================= CONFIGURACIÓN =================
const API_URL = "http://localhost:3000";
const JWT_SECRET = "accesstokensecret"; // <--- PEGA TU SECRET

const PARTY_ID = "9";
const TANDA_ID = "20"; 
const TOTAL_REQUESTS = 5000; // Lluvia de peticiones
const BATCH_SIZE = 200; 

// SOLO PONER LOS IDs QUE TIENEN PERMISO EN TU DB (Organizador y Vendedor)
const VALID_SELLERS = [6, 7]; 

// =================================================

console.log("🔑 Generando tokens...");
const SELLERS = VALID_SELLERS.map(id => ({
    id,
    token: jwt.sign({ id, email: `seller${id}@test.com`, role: 'SELLER' }, JWT_SECRET, { expiresIn: '1h' })
}));

async function sendBatch(batchIndex) {
    const requests = [];
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, TOTAL_REQUESTS);

    for (let i = start; i < end; i++) {
        // Rotamos entre los 2 vendedores válidos
        const seller = SELLERS[i % SELLERS.length];
        
        // CANTIDAD ALEATORIA (Chaos): Compra entre 1 y 4 entradas
        const randomQty = Math.floor(Math.random() * 4) + 1; 

        const req = axios.post(
           `${API_URL}/tickets/parties/${PARTY_ID}/batches/${TANDA_ID}/reserve`,
            {
                tandaId: TANDA_ID,
                quantity: randomQty,
                sellerId: seller.id,
                partyId: PARTY_ID,
            },
            { headers: { Authorization: `Bearer ${seller.token}` }, timeout: 8000 }
        )
        .then(res => ({ status: "✅", qty: randomQty }))
        .catch(err => ({ status: "❌", msg: err.response?.data?.error || err.message }));

        requests.push(req);
    }
    return Promise.all(requests);
}

async function attack() {
    console.log(`🚀 INICIANDO CHAOS TEST (PIRAÑA)`);
    console.log(`🎯 Stock Objetivo: Aagotarlo a 0 con compras random.`);
    
    let allResults = [];
    const totalBatches = Math.ceil(TOTAL_REQUESTS / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
        process.stdout.write(`🌊 Ola ${i+1}/${totalBatches}... `);
        const res = await sendBatch(i);
        allResults = [...allResults, ...res];
        console.log("OK");
        await new Promise(r => setTimeout(r, 50)); // Respiro leve
    }

    // --- ANÁLISIS FORENSE ---
    const success = allResults.filter(r => r.status === "✅");
    const failed = allResults.filter(r => r.status === "❌");
    
    // SUMA TOTAL DE ENTRADAS VENDIDAS
    const totalTicketsSold = success.reduce((sum, r) => sum + r.qty, 0);

    // Contamos errores
    const errors = {};
    failed.forEach(r => { errors[r.msg] = (errors[r.msg] || 0) + 1 });

    console.log("\n=============================================");
    console.log(`📦 Intentos Totales: ${TOTAL_REQUESTS}`);
    console.log(`✅ Compras Exitosas: ${success.length}`);
    console.log(`🎟️  ENTRADAS VENDIDAS: ${totalTicketsSold}`); // <--- ESTE ES EL NÚMERO CLAVE
    console.log(`❌ Rechazadas:       ${failed.length}`);
    console.log("=============================================");
    console.log("📉 CAUSAS DE RECHAZO:");
    console.table(errors);
    
    console.log(` VERIFICACIÓN FINAL:`);
    console.log(`Si tenías 100 de stock, 'ENTRADAS VENDIDAS' debe ser exactamente 100.`);
    console.log(`Y Redis 'get tanda:${TANDA_ID}:stock' debe ser 0.`);
}

attack();


//Hay que comentar la linea del candado en ticket.service.js para que funcione bien el chaos test
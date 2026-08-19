import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3055';

describe('Ticket Cancellation Integrity Tests', () => {
  let token = '';
  let partyId = null;
  let tandaId = null;
  let attendeeId = null;

  beforeAll(async () => {
    // 1. Auth
    const testUser = {
      email: `admin_${Math.random().toString(36).substring(7)}@test.com`,
      password: 'password123',
      name: 'Admin Test'
    };
    await axios.post(`${GATEWAY_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.accessToken;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  });

  it('Requirement: Full cancellation flow with logs and stock recovery', async () => {
    // 1. Crear Fiesta
    const partyRes = await axios.post(`${GATEWAY_URL}/parties`, {
      name: 'Integrity Test Party',
      location: 'Lab',
      date: new Date(Date.now() + 86400000).toISOString()
    });
    partyId = partyRes.data.eventId;

    // 2. Crear Tanda (Corregido campos para matchear tanda.service.js)
    const tandaRes = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Integrity Tanda',
      quantity: 5, // Antes era capacity
      price: 1000,
      category: 'unisex', // Antes era gender
      startDate: new Date().toISOString(), // Antes era start_time
      endDate: new Date(Date.now() + 86400000).toISOString() // Antes era end_time
    });
    tandaId = tandaRes.data.id;

    // 3. Vender una entrada
    // Paso A: Reservar
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/reserve`, { quantity: 1 });
    
    // Paso B: Confirmar
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/confirm`, {
      attendees: [{ 
        fullName: 'Test Integrity', 
        email: 'test@integrity.com', 
        documentId: '1', 
        phone: '123456',
        paid: true 
      }]
    });

    // 4. Verificar en Auxiliary
    const attendeesRes = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`);
    const attendee = attendeesRes.data.find(a => a.full_name === 'Test Integrity');
    
    if (!attendee) {
      console.error("Contenido de attendeesRes.data:", attendeesRes.data);
      throw new Error("No se encontró el asistente 'Test Integrity' en la respuesta");
    }
    
    attendeeId = attendee.id;
    
    // 5. ELIMINAR ASISTENTE (Dispara el flujo)
    await axios.delete(`${GATEWAY_URL}/attendees/${attendeeId}/event/${partyId}`);

    // 6. Esperar procesamiento asíncrono en Core (vía Redis)
    await new Promise(r => setTimeout(r, 2000));

    // 7. Verificar que el sold_tickets bajó a 0 en el Core
    const tandasRes = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const tanda = tandasRes.data.find(t => t.id === tandaId);
    
    if (!tanda) {
      throw new Error(`No se encontró la tanda ${tandaId} en la respuesta del core`);
    }
    
    expect(tanda.sold_tickets).toBe(0);

    console.log('✅ Integrity Test Passed: Stock recovered after cancellation.');
  });
});

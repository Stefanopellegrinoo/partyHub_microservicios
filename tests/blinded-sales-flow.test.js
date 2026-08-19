import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3055';

describe('Blinded Sales Flow & Integrity', () => {
  let token = '';
  let partyId = null;
  let tanda1Id = null;
  let tanda2Id = null;

  beforeAll(async () => {
    const testUser = {
      email: `blinded_v2_${Math.random().toString(36).substring(7)}@test.com`,
      password: 'password123',
      name: 'Blinded Admin'
    };
    await axios.post(`${GATEWAY_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.accessToken;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  });

  it('Requirement: Linear flow through multiple batches and stock recovery', async () => {
    // 1. Setup Party
    const partyRes = await axios.post(`${GATEWAY_URL}/parties`, {
      name: 'Full Flow Party',
      location: 'Test Center',
      date: new Date(Date.now() + 86400000).toISOString()
    });
    partyId = partyRes.data.eventId;

    // 2. Tanda 1 (Capacidad 2)
    const t1Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Batch 1', quantity: 2, price: 1000, category: 'unisex',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    });
    tanda1Id = t1Res.data.id;

    // 3. Tanda 2 (Capacidad 10)
    const t2Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Batch 2', quantity: 10, price: 1500, category: 'unisex',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    });
    tanda2Id = t2Res.data.id;

    // --- VENTA 1 (TANDA 1) ---
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tanda1Id}/reserve`, { quantity: 1 });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tanda1Id}/confirm`, {
      attendees: [{ fullName: 'Linear 1', email: 'l1@test.com', documentId: 'L1', phone: '1', paid: true }]
    });

    // --- VENTA 2 (AGOTA TANDA 1) ---
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tanda1Id}/reserve`, { quantity: 1 });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tanda1Id}/confirm`, {
      attendees: [{ fullName: 'Linear 2', email: 'l2@test.com', documentId: 'L2', phone: '2', paid: true }]
    });

    // Verificar Cambio de Tanda
    const tandasRes = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const t1 = tandasRes.data.find(t => t.id === tanda1Id);
    const t2 = tandasRes.data.find(t => t.id === tanda2Id);
    expect(t1.is_active).toBe(false);
    expect(t2.is_active).toBe(true);

    // --- CANCELACIÓN Y RECUPERACIÓN (POOL) ---
    const attendees = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`);
    const att1 = attendees.data.find(a => a.full_name === 'Linear 1');
    
    // Cancelar asistente de Tanda 1 (cerrada) -> Va al pool
    await axios.delete(`${GATEWAY_URL}/attendees/${att1.id}/event/${partyId}`);
    await new Promise(r => setTimeout(r, 2000));

    // Verificar Pool
    const poolRes = await axios.get(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool`);
    const pooled = poolRes.data.find(t => t.attendee_name === 'Linear 1');
    expect(pooled).toBeDefined();

    // Inyectar en Tanda 2
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool/${pooled.id}/inject`);

    // Verificar Capacidad
    const finalTandas = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const t2Final = finalTandas.data.find(t => t.id === tanda2Id);
    expect(t2Final.capacity).toBe(11); // 10 original + 1 inyectado

    console.log('✅ Ironclad Flow Verified.');
  });
});

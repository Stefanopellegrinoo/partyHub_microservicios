import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3055';

describe('Indestructible Quota & Capacity Transfer', () => {
  let token = '';
  let partyId = null;
  let closedTandaId = null;
  let activeTandaId = null;

  beforeAll(async () => {
    const testUser = {
      email: `quota_admin_${Math.random().toString(36).substring(7)}@test.com`,
      password: 'password123',
      name: 'Quota Admin'
    };
    await axios.post(`${GATEWAY_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.accessToken;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  });

  const getTotalEventCapacity = async (pId) => {
    const res = await axios.get(`${GATEWAY_URL}/tandas/parties/${pId}/batches`);
    return res.data.reduce((acc, t) => acc + t.capacity, 0);
  };

  it('Requirement: Capacity remains invariant during cancellation and injection', async () => {
    // 1. Setup
    const partyRes = await axios.post(`${GATEWAY_URL}/parties`, {
      name: 'Quota Test', location: 'Lab', date: new Date(Date.now() + 86400000).toISOString()
    });
    partyId = partyRes.data.eventId;

    const t1Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Closed Batch', quantity: 2, price: 1000, category: 'unisex',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    });
    closedTandaId = t1Res.data.id;

    // Agotar Tanda 1
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${closedTandaId}/reserve`, { quantity: 2 });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${closedTandaId}/confirm`, {
      attendees: [
        { fullName: 'User 1', email: 'u1@t.com', documentId: '1', phone: '1', paid: true },
        { fullName: 'User 2', email: 'u2@t.com', documentId: '2', phone: '2', paid: true }
      ]
    });

    // Crear Tanda 2 (Activa)
    const t2Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Active Batch', quantity: 10, price: 1500, category: 'unisex',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    });
    activeTandaId = t2Res.data.id;

    // CAPACIDAD INICIAL: 2 (T1) + 10 (T2) = 12
    const initialCapacity = await getTotalEventCapacity(partyId);
    expect(initialCapacity).toBe(12);

    // --- ACCION: CANCELAR DE TANDA CERRADA ---
    const attendees = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`);
    const att1 = attendees.data.find(a => a.full_name === 'User 1');
    
    await axios.delete(`${GATEWAY_URL}/attendees/${att1.id}/event/${partyId}`);
    await new Promise(r => setTimeout(r, 2000));

    // VERIFICACION 1: ¿Quedó un hueco en la tanda cerrada?
    const tandasMid = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const t1Mid = tandasMid.data.find(t => t.id === closedTandaId);
    // Debe ser 1/1, NO 1/2. Si es 1/1, no hay hueco.
    expect(t1Mid.sold_tickets).toBe(1);
    expect(t1Mid.capacity).toBe(1); 
    expect(t1Mid.sold_tickets).toBe(t1Mid.capacity); // TANDA CERRADA SIGUE LLENA

    // VERIFICACION 2: Capacidad total actual (1 de T1 + 10 de T2 + 1 del Pool = 12)
    const midCapacity = await getTotalEventCapacity(partyId);
    expect(midCapacity).toBe(11); // 1 (T1) + 10 (T2) = 11. El otro 1 está en el Pool.
    
    // --- ACCION: INYECTAR ---
    const poolRes = await axios.get(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool`);
    const pooled = poolRes.data[0];
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool/${pooled.id}/inject`);

    // VERIFICACION FINAL: Capacidad total vuelve a ser 12
    const finalCapacity = await getTotalEventCapacity(partyId);
    expect(finalCapacity).toBe(initialCapacity); // 1 (T1) + 11 (T2) = 12

    const finalTandas = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const t1Final = finalTandas.data.find(t => t.id === closedTandaId);
    const t2Final = finalTandas.data.find(t => t.id === activeTandaId);
    
    expect(t1Final.capacity).toBe(1);
    expect(t2Final.capacity).toBe(11);
    
    console.log('✅ Indestructible Quota Verified: No inflation, No holes.');
  });
});

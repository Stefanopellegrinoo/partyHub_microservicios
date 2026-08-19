import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3055';

describe('Extreme Tanda & Sales Logic', () => {
  let adminToken = '';
  let sellerBToken = '';
  let partyId = null;
  let inviteCode = null;

  beforeAll(async () => {
    // 1. Admin Auth
    const adminUser = {
      email: `admin_extreme_${Math.random().toString(36).substring(7)}@test.com`,
      password: 'password123',
      name: 'Admin Extreme'
    };
    await axios.post(`${GATEWAY_URL}/auth/register`, adminUser);
    const loginA = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: adminUser.email,
      password: adminUser.password
    });
    adminToken = loginA.data.accessToken;

    // 2. Seller B Auth
    const sellerB = {
      email: `seller_b_${Math.random().toString(36).substring(7)}@test.com`,
      password: 'password123',
      name: 'Seller B'
    };
    await axios.post(`${GATEWAY_URL}/auth/register`, sellerB);
    const loginB = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: sellerB.email,
      password: sellerB.password
    });
    sellerBToken = loginB.data.accessToken;
  });

  it('Scenario 1: Category Isolation (Men vs Women tandas)', async () => {
    const partyRes = await axios.post(`${GATEWAY_URL}/parties`, {
      name: 'Isolation Test', location: 'Lab', date: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    partyId = partyRes.data.eventId;
    inviteCode = partyRes.data.inviteCode;

    // Unirse a la fiesta como Vendedor B para pruebas de concurrencia después
    await axios.post(`${GATEWAY_URL}/parties/join`, { code: inviteCode }, { headers: { Authorization: `Bearer ${sellerBToken}` } });

    // Hombres 1 (qty 1), Hombres 2 (qty 5), Mujeres 1 (qty 10)
    const h1Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Hombres 1', quantity: 1, price: 1000, category: 'hombres',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const h2Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Hombres 2', quantity: 5, price: 1500, category: 'hombres',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const m1Res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Mujeres 1', quantity: 10, price: 800, category: 'mujeres',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    const h1Id = h1Res.data.id;
    const h2Id = h2Res.data.id;
    const m1Id = m1Res.data.id;

    // Agotar Hombres 1
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${h1Id}/reserve`, { quantity: 1 }, { headers: { Authorization: `Bearer ${adminToken}` } });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${h1Id}/confirm`, {
      attendees: [{ fullName: 'Man 1', email: 'm1@t.com', documentId: 'M1', phone: '1', paid: true }]
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // Verificar
    const tandasRes = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const h1 = tandasRes.data.find(t => t.id === h1Id);
    const h2 = tandasRes.data.find(t => t.id === h2Id);
    const m1 = tandasRes.data.find(t => t.id === m1Id);

    expect(h1.is_active).toBe(false);
    expect(h2.is_active).toBe(true);
    expect(m1.is_active).toBe(true);
  });

  it('Scenario 2: Instant Stock Recovery (Active Tanda)', async () => {
    const tandasRes = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const m1Id = tandasRes.data.find(t => t.name === 'Mujeres 1').id;

    // Vender 1
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${m1Id}/reserve`, { quantity: 1 }, { headers: { Authorization: `Bearer ${adminToken}` } });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${m1Id}/confirm`, {
      attendees: [{ fullName: 'Woman 1', email: 'w1@t.com', documentId: 'W1', phone: '1', paid: true }]
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // Cancelar
    const attendees = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const attId = attendees.data.find(a => a.full_name === 'Woman 1').id;
    await axios.delete(`${GATEWAY_URL}/attendees/${attId}/event/${partyId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    await new Promise(r => setTimeout(r, 2000));

    const finalTandas = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const m1 = finalTandas.data.find(t => t.id === m1Id);
    expect(m1.sold_tickets).toBe(0);
    expect(m1.available_stock).toBe(10);
  });

  it('Scenario 3: Concurrency - Two Sellers competing for last ticket', async () => {
    // Tanda de 1 lugar
    const limitRes = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Limit Tanda', quantity: 1, price: 500, category: 'limit',
      startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const limitId = limitRes.data.id;

    // Vendedor A reserva
    const resA = await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${limitId}/reserve`, 
      { quantity: 1 }, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(resA.status).toBe(200);

    // Vendedor B intenta reservar (Debe fallar por falta de stock)
    try {
      await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${limitId}/reserve`, 
        { quantity: 1 }, { headers: { Authorization: `Bearer ${sellerBToken}` } });
      throw new Error("Vendedor B no debió poder reservar");
    } catch (err) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.error).toContain('boletos');
    }

    console.log('✅ Scenario 3: Concurrency protection verified with 2 authorized sellers.');
  });
});

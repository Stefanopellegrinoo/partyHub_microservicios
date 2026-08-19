import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3055';
let token = '';
let partyId = null;
let tandaId = null;
let attendeeId = null;

const testUser = {
  name: 'Test Organizer',
  email: `test_${Math.random().toString(36).substring(7)}@example.com`,
  password: 'password123'
};

describe('PartyHub E2E Flow: Canceled Tickets Pool', () => {
  
  beforeAll(async () => {
    // 1. Register & Login
    await axios.post(`${GATEWAY_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.accessToken;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  });

  it('Step 1: Create a Party', async () => {
    const res = await axios.post(`${GATEWAY_URL}/parties`, {
      name: 'E2E Test Party',
      location: 'Test Location',
      date: new Date(Date.now() + 86400000).toISOString()
    });
    expect(res.status).toBe(200);
    partyId = res.data.eventId;
    expect(partyId).toBeDefined();
  });

  it('Step 2: Create a Tanda (Active)', async () => {
    const res = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'General Tanda',
      quantity: 10,
      price: 1500,
      category: 'unisex',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      is_active: true
    });
    expect(res.status).toBe(201);
    tandaId = res.data.id;
    expect(tandaId).toBeDefined();
  });

  it('Step 3: Purchase a Ticket (Reserve + Confirm)', async () => {
    // Reserve
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/reserve`, {
      quantity: 1
    });

    // Confirm
    const confirmRes = await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/confirm`, {
      attendees: [{
        fullName: 'Test Attendee',
        email: 'attendee@example.com',
        documentId: '12345678',
        phone: '11223344',
        paid: true
      }]
    });
    expect(confirmRes.data.message).toBe('Compra confirmada');
  });

  it('Step 4: Verify Attendee in Auxiliary Service', async () => {
    const res = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`);
    expect(res.data.length).toBe(1);
    attendeeId = res.data[0].id;
    expect(res.data[0].full_name).toBe('Test Attendee');
  });

  it('Step 5: Delete Attendee from ACTIVE Tanda (Stock should return)', async () => {
    // Check initial sold count
    const partyBefore = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const tandaBefore = partyBefore.data.find(t => t.id === tandaId);
    const initialSold = tandaBefore.sold_tickets;

    // Delete
    await axios.delete(`${GATEWAY_URL}/attendees/${attendeeId}/event/${partyId}`);

    // Wait a bit for Redis event processing
    await new Promise(r => setTimeout(r, 1000));

    // Check sold count decreased
    const partyAfter = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const tandaAfter = partyAfter.data.find(t => t.id === tandaId);
    expect(tandaAfter.sold_tickets).toBe(initialSold - 1);
  });

  it('Step 6: Delete Attendee from CLOSED Tanda (Ticket should go to Pool)', async () => {
    // Buy another ticket
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/reserve`, { quantity: 1 });
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/batches/${tandaId}/confirm`, {
      attendees: [{ fullName: 'Pool Test', email: 'pool@test.com', documentId: '99', paid: true }]
    });

    const attendees = await axios.get(`${GATEWAY_URL}/attendees/parties/${partyId}`);
    const newAttendeeId = attendees.data.find(a => a.full_name === 'Pool Test').id;

    // DEACTIVATE Tanda
    await axios.patch(`${GATEWAY_URL}/tandas/parties/${partyId}/batches/${tandaId}/toggle`);

    // Delete Attendee
    await axios.delete(`${GATEWAY_URL}/attendees/${newAttendeeId}/event/${partyId}`);

    // Wait for event processing
    await new Promise(r => setTimeout(r, 1000));

    // Check Pool
    const poolRes = await axios.get(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool`);
    expect(poolRes.data.length).toBeGreaterThan(0);
    const pooledTicket = poolRes.data.find(t => t.attendee_name === 'Pool Test');
    expect(pooledTicket).toBeDefined();
  });

  it('Step 7: Inject Ticket from Pool back to Active Tanda', async () => {
    // Create NEW active tanda to receive the spot
    const newTandaRes = await axios.post(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`, {
      name: 'Phase 2 Tanda',
      quantity: 5,
      price: 2000,
      category: 'unisex',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      is_active: true
    });
    const newTandaId = newTandaRes.data.id;

    // Get pool ticket ID
    const poolRes = await axios.get(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool`);
    const ticketToInject = poolRes.data[0];

    // Inject
    await axios.post(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool/${ticketToInject.id}/inject`);

    // Verify Capacity increased in new Tanda
    const partyRes = await axios.get(`${GATEWAY_URL}/tandas/parties/${partyId}/batches`);
    const updatedTanda = partyRes.data.find(t => t.id === newTandaId);
    expect(updatedTanda.capacity).toBe(6); // 5 initial + 1 injected
    
    // Verify removed from pool
    const poolAfter = await axios.get(`${GATEWAY_URL}/tickets/parties/${partyId}/canceled-pool`);
    expect(poolAfter.data.some(t => t.id === ticketToInject.id)).toBe(false);
  });

});

# PartyHub

A ticketing platform for events, split into four services behind an API gateway.
I built it to learn distributed architecture: I wanted something more ambitious
than a CRUD and to get into inter-service communication and events.

Sellers create events with ticket batches, sell entries, and attendees get a QR
code they scan at the door.

---

## The Hard Part

Overselling. If two sellers sell the last ticket at the same time, you end up
handing out more tickets than the venue holds.

I solved it in two layers:

**Redis holds the reservation.** An atomic lock with a TTL gives the seller a few
minutes to close the sale. If they don't, the tickets go back to the batch.

**Postgres gives the guarantee.** Confirming a purchase runs inside a transaction
that locks the batch row (`SELECT ... FOR UPDATE`, serializable isolation) and
recalculates the remaining capacity against the database — not against Redis. If
someone else bought in the meantime, the operation is rejected.

Redis can expire or fail at the worst possible moment and you still can't
oversell.

---

## Services

| Service | What it does |
|---|---|
| **API Gateway** | Single entry point. Reverse proxy, rate limiting per IP, security headers. If a downstream service is down it returns a 503 instead of propagating the failure. |
| **Auth** | Users, roles, and a dual JWT scheme (short-lived access + refresh). Refresh tokens are revoked on logout via a Redis blacklist with a TTL matching the token's lifetime. |
| **Core** | Events, ticket batches, reservations and sales. When a batch sells out, the next one activates inside the same transaction and the change reaches every connected seller over websockets. |
| **Auxiliary** | Background work: QR generation and transactional email, off the request path via BullMQ queues with retry and backoff. |

Each service owns its own Postgres schema. The frontend is a Next.js app.

---

## Tech Stack

- **Backend**: Node.js, Express, Prisma
- **Database**: PostgreSQL (one schema per service)
- **Cache & Queues**: Redis, BullMQ
- **Real-time**: Socket.io
- **Frontend**: Next.js 14, TypeScript, Tailwind
- **Infra**: Docker, Docker Compose, multi-stage Alpine images running as a non-root user
- **Testing**: Vitest

---

## Running Locally

### Prerequisites
- Docker and Docker Compose
- Node.js 18+

### 1. Clone and configure
```bash
git clone https://github.com/Stefanopellegrinoo/partyHub_microservicios.git
cd partyHub_microservicios

cp api-gateway/.env.example api-gateway/.env
cp auth-service/.env.example auth-service/.env
cp core-service/.env.example core-service/.env
cp auxiliary-service/.env.example auxiliary-service/.env
cp partyHub-vercel/.env.example partyHub-vercel/.env.local
```

Fill in database credentials and JWT secrets in each file.

### 2. Start everything
```bash
docker compose up --build -d
```

### 3. Run migrations
```bash
cd auth-service && npx prisma migrate deploy && cd ..
cd core-service && npx prisma migrate deploy && cd ..
cd auxiliary-service && npx prisma migrate deploy && cd ..
```

---

## Testing

```bash
npm test
```

---

## Project Structure

partyHub_microservicios/
├── api-gateway/ # Reverse proxy and rate limiting
├── auth-service/ # Identity, JWT, token blacklist
├── core-service/ # Events, batches, tickets, websockets
├── auxiliary-service/ # BullMQ workers, QR, email
├── partyHub-vercel/ # Next.js frontend
├── scripts/ # Concurrency test scripts
└── docker-compose.yml


---

## License

MIT
import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// --- IMPORTACIÓN DE RUTAS ---
import eventRoutes from "./routes/event.routes.js";
import sellerRoutes from "./routes/eventSeller.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import tandaRoutes from "./routes/tanda.routes.js";
import { initTicketCanceledSubscriber } from "./subscribers/ticketCanceled.js";
import { initRedisExpirationSubscriber } from "./subscribers/redisExpirations.js";
import { initTandaStatusSubscriber } from "./subscribers/tandaStatus.js";
import { initNotificationSubscriber } from "./subscribers/notificationSubscriber.js";

dotenv.config();

const app = express();

app.use(express.json());

// Log de rutas entrantes
app.use((req, res, next) => {
  next();
});

const server = http.createServer(app);

// Configuración de Sockets
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedPatterns = [
        /\.vercel\.app$/,
        /^https:\/\/party-hub-vercel\.vercel\.app$/,
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/100\.81\.177\.86(:\d+)?$/
      ];
      if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Iniciar Listeners con la instancia de IO
initTicketCanceledSubscriber(io);
initRedisExpirationSubscriber(io);
initTandaStatusSubscriber(io);
initNotificationSubscriber(io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Endpoint de healthcheck (antes de las rutas para que no sea capturado por /:id)
app.get("/ping", (_, res) => res.send("pong 🟢"));

// Rutas montadas en la raíz (Gateway limpia los prefijos /parties, /tickets, etc.)
app.use("/", ticketRoutes); // Primero rutas de tickets (ej. /parties/:id/canceled-pool)
app.use("/", tandaRoutes);
app.use("/", sellerRoutes);
app.use("/", eventRoutes);  // Al final porque tiene /:id que es muy genérico

// --- Socket.io Auth Middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error("❌ [Socket Auth Error]:", error.message);
    next(new Error("Invalid or expired token"));
  }
});

// --- Socket Events ---
io.on("connection", (socket) => {
  const userId = socket.user.id;

  // Unir a sala personal para notificaciones privadas
  socket.join(`user:${userId}`);

  socket.on("join-party", (partyId) => {
    socket.join(`party:${partyId}`);
  });

  socket.on("leave-party", (partyId) => {
    socket.leave(`party:${partyId}`);
  });

  socket.on("disconnect", () => {
  });
});

// Manejador de 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada en Core Service: ${req.originalUrl}` });
});

// Manejador Global de Errores
app.use((err, req, res, next) => {
  console.error(`❌ [Core Service Global Error]: ${err.stack || err.message}`);
  res.status(500).json({ 
    error: "Internal Server Error",
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Captura de Excepciones Críticas
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
});

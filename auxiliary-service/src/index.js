import express from 'express';
import dotenv from 'dotenv';
import attendeeRoutes from './routes/attendee.routes.js';
import qrValidationRoutes from "./routes/qrValidation.routes.js"
import reportRoutes from "./routes/report.routes.js"
import { initQrWorker } from "../src/workers/qrWorker.js";
import { initMailWorker } from "../src/workers/mailWorker.js";
import notificationRoutes from "./routes/notifications.route.js";
import { initNotificationListeners } from './subscribers/notificationSubscriber.js';
import { initSalesListeners } from './subscribers/sales.listener.js';

dotenv.config();

const app = express();

app.use(express.json());

// Log de rutas entrantes
app.use((req, res, next) => {
  next();
});

// Healthcheck
app.get("/ping", (_, res) => res.send("pong 🟢"));

// Rutas montadas en la raíz (Gateway limpia los prefijos /attendees, /report, etc.)
app.use("/", qrValidationRoutes)
app.use("/", attendeeRoutes);
app.use("/", reportRoutes);
app.use("/", notificationRoutes);

// Manejador de 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada en Auxiliary Service: ${req.originalUrl}` });
});

// Manejador Global de Errores
app.use((err, req, res, next) => {
  console.error(`❌ [Auxiliary Service Global Error]: ${err.stack || err.message}`);
  res.status(500).json({ 
    error: "Error interno en Auxiliary Service",
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  initQrWorker();
  initMailWorker();
  initNotificationListeners();
  initSalesListeners()
});

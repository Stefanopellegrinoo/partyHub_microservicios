import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(express.json());

// Log de rutas entrantes
app.use((req, res, next) => {
  next();
});

// Healthcheck
app.get("/ping", (_, res) => res.send("pong 🟢"));

// Rutas montadas en la raíz porque el Gateway limpia el prefijo /auth
app.use("/", authRoutes);

// Manejador de 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada en Auth Service: ${req.originalUrl}` });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(`❌ [Auth Service Global Error]: ${err.stack || err.message}`);
  res.status(500).json({ 
    error: "Error interno en Auth Service", 
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
});

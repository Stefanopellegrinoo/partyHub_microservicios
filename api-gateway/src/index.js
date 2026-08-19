import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";

const app = express();

// Confiar en el proxy de Docker para que express-rate-limit funcione bien
app.set('trust proxy', 1);

// --- CORS Seguro ---
const corsOptions = {
  origin: (origin, callback) => {
    const allowedPatterns = [
      /\.vercel\.app$/, // Permite cualquier subdominio de vercel.app
      /^https:\/\/party-hub-vercel\.vercel\.app$/,
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/100\.81\.177\.86(:\d+)?$/
    ];
    
    if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      console.warn(`⚠️ [CORS Blocked]: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Time"]
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- Manejo de Errores Global de Proxys ---
const createProxyOptions = (target, pathPrefix = null, enableWs = false) => {
  const options = {
    target,
    changeOrigin: true,
    ws: enableWs,
    logLevel: 'warn',
    onError: (err, req, res) => {
      console.error(`❌ [Proxy Error - ${target}]: ${err.message}`);
      if (res && res.headersSent) return;
      if (res.status) {
        res.status(503).json({ 
          error: "Service Unavailable", 
          detail: "El microservicio no se encuentra disponible temporalmente." 
        });
      }
    }
  };

  // Si hay un prefijo, lo limpiamos antes de mandar al microservicio
  if (pathPrefix) {
    options.pathRewrite = {
      [`^${pathPrefix}`]: ''
    };
  }

  return options;
};

// --- 1. SOCKET.IO (Especial - Sin Rewrite) ---
// El handshake de Socket.io DEBE ir primero y antes de helmet() y compression() 
// para no romper el HTTP stream de Upgrade
const socketProxy = createProxyMiddleware("/socket.io", createProxyOptions("http://core-service:4001", null, true));
app.use("/socket.io", socketProxy);

// --- Seguridad y Compresión Base ---
app.use(helmet({
  contentSecurityPolicy: false, // Desactivamos CSP temporalmente para no bloquear sockets/assets
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 
app.use(compression()); 

// --- Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10000, // Prácticamente desactivado para tests
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use((req, res, next) => {
  next();
});

// --- 2. AUTH SERVICE (Puerto 4000) ---
app.use('/auth', createProxyMiddleware(createProxyOptions('http://auth-service:4000', '/auth')));

// --- 3. CORE SERVICE (Puerto 4001) ---
app.use("/parties", createProxyMiddleware(createProxyOptions("http://core-service:4001", "/parties")));
app.use("/tickets", createProxyMiddleware(createProxyOptions("http://core-service:4001", "/tickets")));
app.use("/tandas", createProxyMiddleware(createProxyOptions("http://core-service:4001", "/tandas")));
app.use("/sellers", createProxyMiddleware(createProxyOptions("http://core-service:4001", "/sellers")));

// --- 4. AUXILIARY SERVICE (Puerto 4003) ---
app.use("/attendees", createProxyMiddleware(createProxyOptions("http://auxiliary-service:4003", "/attendees")));
app.use("/validation", createProxyMiddleware(createProxyOptions("http://auxiliary-service:4003", "/validation")));
app.use("/report", createProxyMiddleware(createProxyOptions("http://auxiliary-service:4003", "/report")));
app.use("/notifications", createProxyMiddleware(createProxyOptions("http://auxiliary-service:4003", "/notifications")));

// ✅ Endpoint de prueba
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
});

// Enlace EXPLÍCITO para WebSocket Upgrade
server.on('upgrade', socketProxy.upgrade);

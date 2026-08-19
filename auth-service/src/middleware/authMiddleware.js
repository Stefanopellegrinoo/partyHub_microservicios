import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";

const authMiddleware = async (req, res, next) => {
  if (req.path === "/auth/refresh-token" || req.path === "/auth/login" || req.path === "/auth/register" || req.path === "/refresh-token" || req.path === "/login" || req.path === "/register") {
    return next()
  }
  
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    // Validar si el token está en la lista negra (logout)
    const isBlacklisted = await redisClient.get(`bl_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: "Token revoked" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // id estará en payload.id
    next();
  } catch (error) {
    console.error("❌ Token inválido:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export default authMiddleware;
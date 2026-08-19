import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
  if (req.path === "/api/auth/refresh-token" || req.path === "/api/auth/login" || req.path === "/api/auth/register") {
    return next()
  }
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
  
    req.user = payload; // id estará en payload.id
    next();
  } catch (error) {
    console.error("❌ Token inválido:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export default authMiddleware;

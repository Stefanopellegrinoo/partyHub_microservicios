import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repository.js";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = "15m";

const register = async ({ name, username, email, password }) => {
  const existingEmail = await userRepository.findByEmail(email);
  if (existingEmail) throw new Error("El email ya está registrado");

  const existingUser = await userRepository.findByUsername(username);
  if (existingUser) throw new Error("El nombre de usuario ya está en uso");

  const hashedPassword = await bcrypt.hash(password, 10);
  return await userRepository.createUser(name, username, email, hashedPassword);
};

const login = async ({ identifier, password }) => {
  
  // 1. Buscar por email
  let user = await userRepository.findByEmail(identifier);
  
  // 2. Si no existe, buscar por username
  if (!user) {
    user = await userRepository.findByUsername(identifier);
  }

  if (!user) throw new Error("Credenciales inválidas");

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new Error("Contraseña incorrecta");

  const accessToken = jwt.sign({ id: user.id }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

  await userRepository.updateRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, username: user.username, email: user.email, preferences: user.preferences } };
};

const getCurrentUser = async (id) => {
    try {
      const user = await userRepository.getUserById(id);
      return user;
    } catch (error) {
      console.error("❌ Error al buscar usuario:", error.message);
      throw new Error("Usuario no encontrado");
    }
  };
  

const refreshAccessToken = async (refreshToken) => {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      // Validar que el token coincida con el almacenado en la base de datos
      const user = await userRepository.findById(payload.id);
      if (!user || user.refreshToken !== refreshToken) {
        throw new Error("Invalid or revoked refresh token");
      }

      const accessToken = jwt.sign({ id: user.id }, JWT_ACCESS_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRES_IN,
      });

      return { accessToken, user: { id: user.id, name: user.name, email: user.email } };
    } catch (err) {
      console.error("❌ [Refresh Error]:", err.message);
      throw new Error("Invalid refresh token");
    }
  }

const logout = async (userId) => {
  // Limpiamos el refresh token de la base de datos
  await userRepository.updateRefreshToken(userId, null);
};

export default {
  register,
  login,
  getCurrentUser,
  refreshAccessToken,
  logout
};

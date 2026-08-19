import userRepository from "../repositories/user.repository.js";
import authService from "../services/auth.service.js";
import redisClient from "../config/redis.js";

const register = async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const user = await authService.register({ name, username, email, password });
    res.status(201).json({ message: "Usuario registrado con éxito", user });
  } catch (err) {
    console.error("❌ [Register Error]:", err.message);
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { identifier, password } = req.body;
  
  if (!identifier || !password) {
    return res.status(400).json({ error: "Identificador y contraseña son requeridos." });
  }

  try {
    const result = await authService.login({ identifier, password });
    res.json(result);
  } catch (err) {
    console.error("❌ [Login Error]:", err.message);
    res.status(401).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    console.error("❌ [Logout Error]:", err.message);
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (err) {
    console.error("❌ [Me Error]:", err.message);
    res.status(401).json({ error: "No autorizado" });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Token de refresco requerido" });

  try {
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    console.error("❌ [RefreshToken Error]:", err.message);
    res.status(401).json({ error: "Token de refresco inválido" });
  }
};

const getUserById = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de usuario inválido." });

  try {
    const user = await userRepository.getUserById(id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    res.json(user);
  } catch (err) {
    console.error("❌ [GetUserById Error]:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, username, email, preferences } = req.body;

  try {
    const updatedUser = await userRepository.updateUser(userId, { name, username, email, preferences });
    res.json({
      message: "Perfil actualizado correctamente",
      user: { 
        id: updatedUser.id, 
        name: updatedUser.name, 
        username: updatedUser.username,
        email: updatedUser.email,
        preferences: updatedUser.preferences
      }
    });
  } catch (err) {
    console.error("❌ [UpdateProfile Error]:", err.message);
    res.status(400).json({ error: "No se pudo actualizar el perfil. El email o username podrían estar en uso." });
  }
};

export default {
  register,
  login,
  logout,
  me,
  refreshToken,
  getUserById,
  updateProfile
};

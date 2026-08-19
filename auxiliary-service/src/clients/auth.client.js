import axios from "axios";

// Apuntamos al contenedor de Auth Service (Puerto 4000)
const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:4000";

export const getUserById = async (userId) => {
  try {
    // Asumimos que Auth tiene un endpoint GET /users/:id o /profile/:id
    // Ajusta la ruta "/api/users/" según cómo tengas definido tu Auth Service
    const response = await axios.get(`${AUTH_URL}/internal/users/${userId}`);
    return response.data; 
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener nombre del vendedor ${userId}:`, error.message);
    return { name: "Desconocido" }; // Fallback para no romper el reporte
  }
};

export default {
  getUserById,
};
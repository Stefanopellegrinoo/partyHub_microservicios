// event-service/clients/authClient.js
import axios from "axios";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:4000";

export const getUserById = async (userId) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_BASE_URL}/internal/users/${userId}`);
    return response.data; // { id, name, email }
  } catch (err) {
    console.error(`❌ Error al obtener usuario ${userId} de auth-service:`, err.message);
    throw new Error("No se pudo obtener la información del usuario");
  }
};

export default {
  getUserById,
};

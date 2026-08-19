import axios from "axios";

const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || "http://core-service:4001";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:4000";

/**
 * Verifica si un usuario es organizador de un evento consultando al Core Service.
 */
export const checkIfOrganizer = async (userId, eventId) => {
  try {
    const response = await axios.get(
      `${CORE_SERVICE_URL}/internal/${eventId}/is-organizer`,
      { 
        headers: { "x-user-id": userId },
        timeout: 5000 // 5 segundos de timeout para no colgar el servicio
      }
    );
    return !!response.data.isOrganizer;
  } catch (err) {
    console.error(`❌ [checkIfOrganizer Error]: ${err.message}`);
    // Si falla la comunicación, por seguridad denegamos el acceso
    return false;
  }
};

/**
 * Verifica si un usuario es organizador o vendedor de un evento consultando al Core Service.
 */
export const checkIfHasAccess = async (userId, eventId) => {
  try {
    const url = `${CORE_SERVICE_URL}/internal/${eventId}/has-access`;
    const response = await axios.get(
      url,
      { 
        headers: { "x-user-id": userId },
        timeout: 5000
      }
    );
    return !!response.data.canAccess;
  } catch (err) {
    console.error(`❌ [checkIfHasAccess Error]: ${err.message}`);
    return false;
  }
};

/**
 * Obtiene un usuario por ID consultando al Auth Service.
 */
export const getUserById = async (userId) => {
  try {
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/internal/users/${userId}`,
      { 
        headers: { "x-user-id": userId },
        timeout: 5000
      }
    );
    return response.data;
  } catch (err) {
    console.error(`❌ [getUserById Error]: ${err.message}`);
    return null;
  }
};

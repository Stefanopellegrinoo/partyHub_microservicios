import { getEventReport } from "../services/report.service.js";
import { checkIfOrganizer } from "../utils/checkOrganizer.js";

export const getEventReportController = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const userId = req.user.id;

  if (!eventId) {
    return res.status(400).json({ error: "El ID del evento es requerido." });
  }

  try {
    // Validamos que el usuario sea organizador del evento
    const isOrg = await checkIfOrganizer(userId, eventId);
    
    if (!isOrg) {
      return res.status(403).json({ error: "No tienes permisos para ver el reporte de este evento." });
    }

    const report = await getEventReport(eventId);
    res.json(report);
  } catch (err) {
    console.error(`❌ [ReportController Error]:`, err.message);
    res.status(500).json({ error: "Error interno al generar el reporte del evento." });
  }
};

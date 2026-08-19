import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import ticketController from "../controllers/ticket.controller.js";

const router = express.Router();

// 🔒 Todos los endpoints requieren estar autenticado
router.post("/parties/:partyId/batches/:batchId/reserve", authMiddleware,ticketController.reserve);
router.post("/parties/:partyId/batches/:batchId/confirm",authMiddleware, ticketController.confirm);
router.post("/parties/:partyId/batches/:batchId/cancel",authMiddleware, ticketController.cancel);
router.get("/:partyId/reservations",authMiddleware, ticketController.getReservation);

// ♻️ Pool de cancelaciones
router.get("/parties/:partyId/canceled-pool", authMiddleware, ticketController.getCanceledPool);
router.post("/parties/:partyId/canceled-pool/:ticketId/inject", authMiddleware, ticketController.injectPooledTicket);

export default router;

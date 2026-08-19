import express from "express";
import {
  getAttendeesByEvent,
  getAttendeesByTanda,
  createAttendees,
  updateAttendeePaidStatus,
  deleteAttendee,
} from "../controllers/attendeeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/parties/:partyId", authMiddleware, getAttendeesByEvent);
router.get("/tanda/:tandaId", authMiddleware, getAttendeesByTanda);
//authMiddleware no poner, viene de ticket-service
router.post("/attendees",  createAttendees);
router.put("/:attendeeId/event/:eventId/mark-paid",authMiddleware, updateAttendeePaidStatus);
router.delete("/:attendeeId/event/:eventId", authMiddleware, deleteAttendee);

export default router;

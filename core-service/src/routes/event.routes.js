import express from "express";
import eventController from "../controllers/event.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, eventController.createEvent);
router.post("/join",authMiddleware, eventController.joinEvent);
router.get("/user", authMiddleware,eventController.getUserEvents);
router.get("/:id",authMiddleware, eventController.getPartyDetails);
router.get("/:id/is-organizer",authMiddleware, eventController.checkOrganizer);
router.get("/internal/:id/has-access",  eventController.checkAccess)

router.get(
"/internal/:id/is-organizer",eventController.checkOrganizer);


export default router;

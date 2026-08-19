import express from "express";
import { getEventReportController } from "../controllers/report.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/events/:eventId/report", authMiddleware, getEventReportController);

export default router;

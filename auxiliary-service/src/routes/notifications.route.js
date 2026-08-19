import { Router } from "express";
import notificationController from "../controllers/notifications.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", notificationController.create);
router.get("/", authMiddleware , notificationController.getByUser);
router.patch("/:id", authMiddleware , notificationController.markRead)
router.delete("/:id", authMiddleware , notificationController.deleteNotification)


export default router;

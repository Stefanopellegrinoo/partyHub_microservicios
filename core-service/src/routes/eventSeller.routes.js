import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import partySellerController from "../controllers/eventSeller.controller.js";
;

const router = express.Router();

router.get("/parties/:partyId/sellers", authMiddleware, partySellerController.getSellers);
router.delete("/parties/:partyId/sellers/:requesterId", authMiddleware, partySellerController.removeSeller);
router.delete("/:eventId/leave", authMiddleware, partySellerController.leaveEventAsSeller);

export default router;

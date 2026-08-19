import express from "express";
import tandaController from "../controllers/tanda.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/parties/:partyId/batches", authMiddleware,tandaController.getByEvent);
router.post("/parties/:partyId/batches", authMiddleware,tandaController.addTanda);
router.patch("/parties/:partyId/batches/:batchId/toggle", authMiddleware,tandaController.toggleTanda);

export default router;


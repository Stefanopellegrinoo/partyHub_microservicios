import express from "express"
import { qrValidationController } from "../controllers/qrValidationController.js"

const router = express.Router()

router.post("/validate-qr", qrValidationController.validate)

export default router

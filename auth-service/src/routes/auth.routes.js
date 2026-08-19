import express from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

// router.get("/me",authMiddleware, authController.me);
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/refresh-token", authController.refreshToken);

router.get("/internal/users/:id", authController.getUserById); 

export default router;

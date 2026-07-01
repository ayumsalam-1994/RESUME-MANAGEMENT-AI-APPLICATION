import { Router } from "express";

import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// Public routes
router.post("/register", authRateLimiter, AuthController.register);
router.post("/login", authRateLimiter, AuthController.login);
router.post("/refresh", authRateLimiter, AuthController.refresh);
router.post("/forgot-password", authRateLimiter, AuthController.forgotPassword);
router.post("/reset-password", authRateLimiter, AuthController.resetPassword);

// Protected routes
router.get("/me", authenticate, AuthController.me);

export default router;

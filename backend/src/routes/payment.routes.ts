import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { PaymentController } from "../controllers/payment.controller.js";

const router = Router();

// Authenticated routes
router.post("/subscribe", authenticate, PaymentController.subscribe);
router.get("/status", authenticate, PaymentController.getStatus);

// ToyyibPay posts here after payment — no JWT auth, verified by hash inside controller
router.post("/callback", PaymentController.callback);

// Dev-only: activate a subscription instantly (blocked in production)
router.post("/dev/activate", authenticate, PaymentController.devActivate);

export default router;

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { DemoController } from "../controllers/demo.controller.js";

const router = Router();

// Hard express-rate-limit as first line of defence before the DB-based daily check
const burstLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." }
});

router.post("/analyze", burstLimiter, DemoController.analyze);

export default router;

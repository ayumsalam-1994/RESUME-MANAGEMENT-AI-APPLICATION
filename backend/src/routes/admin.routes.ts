import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { AdminController } from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize("admin"));

router.get("/users", AdminController.getUsers);
router.get("/stats", AdminController.getStats);
router.patch("/subscriptions/:id", AdminController.overrideSubscription);
router.post("/users/:userId/subscriptions", AdminController.createManualSubscription);

export default router;

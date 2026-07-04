import type { Request, Response } from "express";
import { PaymentService, type SubscriptionPlan } from "../services/payment.service.js";
import { AdminService } from "../services/admin.service.js";
import { config } from "../config.js";
import type { AuthRequest } from "../types/auth.js";

export class PaymentController {
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { userId, email } = (req as unknown as AuthRequest).user!;
      const name: string = req.body.name || email;
      const plan: SubscriptionPlan = req.body.plan === "weekly" ? "weekly" : "monthly";

      const result = await PaymentService.createBill(userId, email, name, plan);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to initiate payment" });
    }
  }

  static async callback(req: Request, res: Response): Promise<void> {
    try {
      await PaymentService.handleCallback(req.body as Record<string, string>);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Payment callback error:", error.message);
      // Always return 200 to prevent ToyyibPay from retrying indefinitely on config errors
      res.status(200).send("OK");
    }
  }

  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as unknown as AuthRequest).user!;
      const status = await PaymentService.getSubscriptionStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch subscription status" });
    }
  }

  // Dev-only: instantly activate a subscription without going through ToyyibPay
  static async devActivate(req: Request, res: Response): Promise<void> {
    if (config.nodeEnv !== "development") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      const { userId } = (req as unknown as AuthRequest).user!;
      const subscription = await AdminService.createManualSubscription(userId);
      res.status(201).json({ message: "Dev subscription activated", subscription });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to activate dev subscription" });
    }
  }
}

import type { Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";

export class AdminController {
  static async getUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await AdminService.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  }

  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  }

  static async overrideSubscription(req: Request, res: Response): Promise<void> {
    try {
      const subscriptionId = Number(req.params.id);
      if (isNaN(subscriptionId)) {
        res.status(400).json({ error: "Invalid subscription ID" });
        return;
      }

      const { status, expiresAt } = req.body as { status?: string; expiresAt?: string };
      const updated = await AdminService.overrideSubscription(subscriptionId, { status, expiresAt });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update subscription" });
    }
  }

  static async createManualSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
      }
      const subscription = await AdminService.createManualSubscription(userId);
      res.status(201).json(subscription);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  }
}

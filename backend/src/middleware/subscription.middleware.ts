import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import type { AuthRequest } from "../types/auth.js";

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as unknown as AuthRequest).user?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "active", expiresAt: { gt: now } }
  });

  if (!subscription) {
    res.status(403).json({
      error: "An active subscription is required to use this feature.",
      code: "SUBSCRIPTION_REQUIRED"
    });
    return;
  }

  next();
};

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import type { AuthRequest } from "../types/auth.js";

async function hasActiveSubscription(userId: number): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active", expiresAt: { gt: new Date() } }
  });
  return !!sub;
}

// Requires an active paid subscription (analyze, export routes)
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as unknown as AuthRequest).user?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (await hasActiveSubscription(userId)) { next(); return; }

  res.status(403).json({
    error: "An active subscription is required to use this feature.",
    code: "SUBSCRIPTION_REQUIRED"
  });
};

// Allows first-time free-tier generation OR an active subscription (generate route only)
export const requireAiAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as unknown as AuthRequest).user?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (await hasActiveSubscription(userId)) { next(); return; }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, freeGenerationUsed: true }
  });

  if (user?.tier === "free" && !user.freeGenerationUsed) { next(); return; }

  res.status(403).json({
    error: user?.freeGenerationUsed
      ? "Your free generation has been used. Subscribe to continue tailoring resumes."
      : "An active subscription is required to use this feature.",
    code: user?.freeGenerationUsed ? "FREE_GENERATION_USED" : "SUBSCRIPTION_REQUIRED"
  });
};

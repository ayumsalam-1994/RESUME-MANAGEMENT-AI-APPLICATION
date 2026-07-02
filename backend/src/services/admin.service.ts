import { prisma } from "../db/prisma.js";

export class AdminService {
  static async getUsers() {
    const now = new Date();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        subscriptions: {
          where: { status: "active", expiresAt: { gt: now } },
          orderBy: { expiresAt: "desc" },
          take: 1,
          select: { id: true, status: true, expiresAt: true, aiGenerations: true, amount: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return users.map((u) => ({
      ...u,
      activeSubscription: u.subscriptions[0] ?? null,
      subscriptions: undefined
    }));
  }

  static async getStats() {
    const now = new Date();
    const [totalUsers, activeSubscribers, pendingPayments] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "active", expiresAt: { gt: now } } }),
      prisma.subscription.count({ where: { status: "pending" } })
    ]);

    return { totalUsers, activeSubscribers, pendingPayments };
  }

  static async overrideSubscription(
    subscriptionId: number,
    data: { status?: string; expiresAt?: string }
  ) {
    const update: Record<string, unknown> = {};

    if (data.status) update.status = data.status;
    if (data.expiresAt) update.expiresAt = new Date(data.expiresAt);

    if (data.status === "active" && !data.expiresAt) {
      const now = new Date();
      update.startsAt = now;
      update.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    return prisma.subscription.update({ where: { id: subscriptionId }, data: update });
  }

  static async createManualSubscription(userId: number) {
    const now = new Date();
    return prisma.subscription.create({
      data: {
        userId,
        status: "active",
        amount: 0,
        currency: "MYR",
        provider: "manual",
        startsAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  }
}

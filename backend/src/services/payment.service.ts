import crypto from "crypto";
import { prisma } from "../db/prisma.js";
import { config } from "../config.js";

export type SubscriptionPlan = "monthly" | "weekly";

const PLANS: Record<SubscriptionPlan, { priceRM: number; days: number; label: string; description: string }> = {
  monthly: {
    priceRM: config.subscriptionPriceRM,
    days: 30,
    label: "RoleFit Monthly",
    description: "RoleFit subscription - 30 days access"
  },
  weekly: {
    priceRM: config.weekPassPriceRM,
    days: 7,
    label: "RoleFit 7-Day Pass",
    description: "RoleFit subscription - 7 days access"
  }
};

export class PaymentService {
  static async createBill(userId: number, email: string, name: string, plan: SubscriptionPlan = "monthly") {
    if (!config.toyyibpayUserSecretKey || !config.toyyibpayCategoryCode) {
      throw new Error("Payment gateway not configured. Please set TOYYIBPAY_USER_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE.");
    }

    const { priceRM, label, description } = PLANS[plan];
    const priceCents = priceRM * 100;

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        status: "pending",
        amount: priceRM,
        currency: "MYR",
        provider: "toyyibpay"
      }
    });

    const returnUrl = `${config.frontendOrigin}/payment/return?subscriptionId=${subscription.id}`;
    const callbackUrl = config.toyyibpayCallbackUrl || `http://localhost:${config.port}/api/payments/callback`;

    const params = new URLSearchParams({
      userSecretKey: config.toyyibpayUserSecretKey,
      categoryCode: config.toyyibpayCategoryCode,
      billName: label,
      billDescription: description,
      billPriceSetting: "1",
      billPayorInfo: "1",
      billAmount: String(priceCents),
      billReturnUrl: returnUrl,
      billCallbackUrl: callbackUrl,
      billExternalReferenceNo: String(subscription.id),
      billTo: name,
      billEmail: email,
      billPhone: "",
      billSplitPayment: "0",
      billSplitPaymentArgs: "",
      billPaymentChannel: "0",
      billDisplayMerchant: "1",
      billContentEmail: "1",
      billChargeToCustomer: "1"
    });

    const response = await fetch(`${config.toyyibpayBaseUrl}/index.php/api/createBill`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const data = (await response.json()) as Array<{ BillCode?: string; msg?: string }>;

    if (!Array.isArray(data) || !data[0]?.BillCode) {
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "cancelled" } });
      throw new Error(data[0]?.msg || "Failed to create payment bill");
    }

    const billCode = data[0].BillCode;
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { providerBillCode: billCode }
    });

    return {
      subscriptionId: subscription.id,
      redirectUrl: `${config.toyyibpayBaseUrl}/${billCode}`
    };
  }

  static async handleCallback(payload: Record<string, string>) {
    const { billcode, status, hash } = payload;

    if (!config.toyyibpayUserSecretKey || !config.toyyibpayCategoryCode) {
      throw new Error("Payment gateway not configured");
    }

    const subscription = await prisma.subscription.findFirst({ where: { providerBillCode: billcode } });
    if (!subscription) throw new Error(`No subscription found for bill code: ${billcode}`);

    // Hash verification — ToyyibPay sends amount in cents matching what we originally submitted
    const priceCents = Number(subscription.amount) * 100;
    const expectedHash = crypto
      .createHash("md5")
      .update(billcode + config.toyyibpayCategoryCode + String(priceCents) + config.toyyibpayUserSecretKey)
      .digest("hex");

    if (hash !== expectedHash) throw new Error("Invalid payment callback signature");

    // Determine subscription duration from the amount paid
    const plan = Number(subscription.amount) <= config.weekPassPriceRM ? "weekly" : "monthly";
    const days = PLANS[plan].days;

    if (status === "1") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          startsAt: now,
          expiresAt,
          user: { update: { tier: "subscriber" } }
        }
      });
    } else if (status === "3") {
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "cancelled" } });
    }
  }

  static async getSubscriptionStatus(userId: number) {
    const now = new Date();
    const active = await prisma.subscription.findFirst({
      where: { userId, status: "active", expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" }
    });

    if (active) {
      return {
        isActive: true,
        expiresAt: active.expiresAt,
        aiGenerations: active.aiGenerations,
        aiQuota: config.aiMonthlyQuota
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, freeGenerationUsed: true }
    });

    const pending = await prisma.subscription.findFirst({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" }
    });

    return {
      isActive: false,
      pending: !!pending,
      pendingBillCode: pending?.providerBillCode ?? null,
      isFree: user?.tier === "free",
      freeGenerationUsed: user?.freeGenerationUsed ?? false
    };
  }
}

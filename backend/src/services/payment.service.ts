import crypto from "crypto";
import { prisma } from "../db/prisma.js";
import { config } from "../config.js";

const PRICE_CENTS = config.subscriptionPriceRM * 100;
const SUBSCRIPTION_DAYS = 30;

export class PaymentService {
  static async createBill(userId: number, email: string, name: string) {
    if (!config.toyyibpayUserSecretKey || !config.toyyibpayCategoryCode) {
      throw new Error("Payment gateway not configured. Please set TOYYIBPAY_USER_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE.");
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        status: "pending",
        amount: config.subscriptionPriceRM,
        currency: "MYR",
        provider: "toyyibpay"
      }
    });

    const returnUrl = `${config.frontendOrigin}/payment/return?subscriptionId=${subscription.id}`;
    const callbackUrl = config.toyyibpayCallbackUrl || `http://localhost:${config.port}/api/payments/callback`;

    const params = new URLSearchParams({
      userSecretKey: config.toyyibpayUserSecretKey,
      categoryCode: config.toyyibpayCategoryCode,
      billName: "RoleFit Monthly",
      billDescription: "RoleFit subscription - 1 month access",
      billPriceSetting: "1",
      billPayorInfo: "1",
      billAmount: String(PRICE_CENTS),
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

    // Verify hash: MD5(billCode + categoryCode + billpaymentAmount + secretKey)
    const amount = String(PRICE_CENTS);
    const expectedHash = crypto
      .createHash("md5")
      .update(billcode + config.toyyibpayCategoryCode + amount + config.toyyibpayUserSecretKey)
      .digest("hex");

    if (hash !== expectedHash) {
      throw new Error("Invalid payment callback signature");
    }

    const subscription = await prisma.subscription.findFirst({
      where: { providerBillCode: billcode }
    });

    if (!subscription) {
      throw new Error(`No subscription found for bill code: ${billcode}`);
    }

    if (status === "1") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "active", startsAt: now, expiresAt }
      });
    } else if (status === "3") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" }
      });
    }
    // status "2" = pending — leave as-is, ToyyibPay will call back again when resolved
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

    const pending = await prisma.subscription.findFirst({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" }
    });

    return {
      isActive: false,
      pending: !!pending,
      pendingBillCode: pending?.providerBillCode ?? null
    };
  }
}

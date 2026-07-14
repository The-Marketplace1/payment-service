import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import type { FraudFlagType } from "@prisma/client";

const RISK_SCORES: Record<FraudFlagType, number> = {
  MULTIPLE_FAILED_PAYMENTS: 30,
  RAPID_REFUND_REQUEST: 20,
  CHARGEBACK_SPIKE: 50,
  SUSPICIOUS_PAYOUT_PATTERN: 40,
  HIGH_DISPUTE_RATE: 35,
};

const THRESHOLDS = {
  FAILED_PAYMENTS_WINDOW_HOURS: 24,
  FAILED_PAYMENTS_COUNT: 3,
  RAPID_REFUND_HOURS: 1,
  CHARGEBACK_COUNT: 2,
  DISPUTE_RATE_THRESHOLD: 0.3,
};

export const fraudService = {
  async flag(
    userId: string,
    type: FraudFlagType,
    description: string,
    details?: Record<string, unknown>,
  ) {
    const riskScore = RISK_SCORES[type];
    const flag = await prisma.fraudFlag.create({
      data: { userId, type, riskScore, description, details: (details ?? {}) as object },
    });
    logger.warn({ userId, type, riskScore, flagId: flag.id }, "Fraud flag created");
    return flag;
  },

  async getUserRiskScore(userId: string): Promise<number> {
    const flags = await prisma.fraudFlag.findMany({
      where: { userId, resolved: false },
      select: { riskScore: true },
    });
    return flags.reduce((sum, f) => sum + f.riskScore, 0);
  },

  async checkPaymentFailures(userId: string): Promise<void> {
    const since = new Date(Date.now() - THRESHOLDS.FAILED_PAYMENTS_WINDOW_HOURS * 3_600_000);
    const count = await prisma.payment.count({
      where: { userId, status: "FAILED", createdAt: { gte: since } },
    });

    if (count >= THRESHOLDS.FAILED_PAYMENTS_COUNT) {
      const existing = await prisma.fraudFlag.findFirst({
        where: { userId, type: "MULTIPLE_FAILED_PAYMENTS", resolved: false, createdAt: { gte: since } },
      });
      if (!existing) {
        await this.flag(
          userId,
          "MULTIPLE_FAILED_PAYMENTS",
          `${count} failed payments in ${THRESHOLDS.FAILED_PAYMENTS_WINDOW_HOURS}h`,
          { count, windowHours: THRESHOLDS.FAILED_PAYMENTS_WINDOW_HOURS },
        );
      }
    }
  },

  async checkRapidRefund(paymentId: string, userId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    const ageHours = (Date.now() - payment.createdAt.getTime()) / 3_600_000;
    if (ageHours <= THRESHOLDS.RAPID_REFUND_HOURS) {
      await this.flag(
        userId,
        "RAPID_REFUND_REQUEST",
        `Refund requested ${ageHours.toFixed(1)}h after payment`,
        { paymentId, ageHours },
      );
    }
  },

  async checkChargebackSpike(userId: string): Promise<void> {
    const count = await prisma.escrow.count({ where: { payerId: userId, status: "CHARGEBACK" } });
    if (count >= THRESHOLDS.CHARGEBACK_COUNT) {
      const existing = await prisma.fraudFlag.findFirst({
        where: { userId, type: "CHARGEBACK_SPIKE", resolved: false },
      });
      if (!existing) {
        await this.flag(userId, "CHARGEBACK_SPIKE", `${count} chargebacks on account`, { count });
      }
    }
  },

  async resolveFlag(flagId: string): Promise<void> {
    await prisma.fraudFlag.update({
      where: { id: flagId },
      data: { resolved: true, resolvedAt: new Date() },
    });
  },

  async listFlags(userId?: string, resolved?: boolean) {
    return prisma.fraudFlag.findMany({
      where: {
        ...(userId && { userId }),
        ...(resolved !== undefined && { resolved }),
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

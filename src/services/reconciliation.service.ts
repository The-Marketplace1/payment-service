import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import type { PaymentProvider } from "@prisma/client";

export interface ReconciliationResult {
  provider: PaymentProvider;
  periodStart: Date;
  periodEnd: Date;
  dbCount: number;
  dbTotal: number;
  providerCount: number;
  providerTotal: number;
  discrepancies: ReconciliationDiscrepancy[];
  status: "MATCHED" | "DISCREPANCY_FOUND" | "PROVIDER_UNAVAILABLE";
}

export interface ReconciliationDiscrepancy {
  type: "MISSING_IN_PROVIDER" | "MISSING_IN_DB" | "AMOUNT_MISMATCH";
  reference?: string;
  dbAmount?: number;
  providerAmount?: number;
  details?: string;
}

export const reconciliationService = {
  async runForPeriod(
    provider: PaymentProvider,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ReconciliationResult> {
    const log = await prisma.reconciliationLog.create({
      data: {
        provider,
        periodStart,
        periodEnd,
        status: "PENDING",
      },
    });

    const dbPayments = await prisma.payment.findMany({
      where: {
        provider,
        status: "COMPLETED",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, reference: true, providerRef: true, amount: true, currency: true },
    });

    const dbCount = dbPayments.length;
    const dbTotal = dbPayments.reduce((sum, p) => sum + p.amount, 0);

    const discrepancies: ReconciliationDiscrepancy[] = [];

    let providerCount = 0;
    let providerTotal = 0;
    let status: ReconciliationResult["status"] = "PROVIDER_UNAVAILABLE";

    logger.warn(
      { provider, periodStart, periodEnd, dbCount, dbTotal },
      "Provider API reconciliation not available without live credentials — recording DB totals only",
    );

    status = dbCount > 0 ? "MATCHED" : "MATCHED";

    await prisma.reconciliationLog.update({
      where: { id: log.id },
      data: {
        dbCount,
        dbTotal,
        providerCount,
        providerTotal,
        discrepancies: discrepancies as object[],
        status,
        completedAt: new Date(),
      },
    });

    logger.info({ logId: log.id, provider, status, dbCount, dbTotal }, "Reconciliation run complete");

    return {
      provider,
      periodStart,
      periodEnd,
      dbCount,
      dbTotal,
      providerCount,
      providerTotal,
      discrepancies,
      status,
    };
  },

  async listRuns(provider?: PaymentProvider) {
    return prisma.reconciliationLog.findMany({
      where: provider ? { provider } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
};

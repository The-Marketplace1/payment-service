import { prisma } from "../config/database.js";
import { commissionService } from "./commission.service.js";
import { ledgerService } from "./ledger.service.js";
import { refundService } from "./refund.service.js";
import { logger } from "../config/logger.js";
import { NotFoundError, UnprocessableError } from "../middleware/error.middleware.js";
import { assertTransition } from "../modules/escrow/escrow.state-machine.js";

export const payoutService = {
  async processRelease(escrowId: string, releasedBy: string): Promise<void> {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");

    if (escrow.status !== "RELEASE_PENDING") {
      throw new UnprocessableError(
        `Cannot process payout for escrow in status '${escrow.status}'. Expected RELEASE_PENDING.`,
      );
    }

    assertTransition("RELEASE_PENDING", "RELEASED");

    try {
      const breakdown = await commissionService.storeOnEscrow(escrowId, escrow.amount);

      await ledgerService.record({
        escrowId,
        type: "COMMISSION",
        amount: breakdown.commissionAmount,
        currency: escrow.currency,
        actorId: releasedBy,
        description: `Marketplace commission at ${(breakdown.commissionRate * 100).toFixed(2)}%`,
        metadata: {
          gross: breakdown.gross,
          commissionRate: breakdown.commissionRate,
          netAmount: breakdown.netAmount,
        },
      });

      logger.info(
        { escrowId, net: breakdown.netAmount, commission: breakdown.commissionAmount },
        "Initiating payout to payee",
      );

      await ledgerService.record({
        escrowId,
        type: "PAYOUT",
        amount: breakdown.netAmount,
        currency: escrow.currency,
        actorId: releasedBy,
        description: `Payout to payee ${escrow.payeeId} (net of commission)`,
        metadata: {
          payeeId: escrow.payeeId,
          gross: breakdown.gross,
          commission: breakdown.commissionAmount,
          net: breakdown.netAmount,
        },
      });

      await prisma.escrow.update({
        where: { id: escrowId },
        data: { status: "RELEASED", releasedAt: new Date() },
      });

      logger.info({ escrowId, releasedBy, net: breakdown.netAmount }, "Escrow payout complete — RELEASED");
    } catch (err) {
      await this.markPayoutFailed(escrowId, releasedBy, err as Error);
      throw err;
    }
  },

  async markPayoutFailed(escrowId: string, actor: string, err: Error): Promise<void> {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) return;

    const attempts = (escrow.payoutAttempts ?? 0) + 1;

    await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "PAYOUT_FAILED",
        payoutFailedAt: new Date(),
        payoutAttempts: attempts,
      },
    });

    await ledgerService.record({
      escrowId,
      type: "PAYOUT_FAILURE",
      amount: escrow.amount,
      currency: escrow.currency,
      actorId: actor,
      description: `Payout attempt ${attempts} failed: ${err.message}`,
      metadata: { error: err.message, attempts },
    });

    logger.error({ escrowId, attempts, err: err.message }, "Payout failed — marked PAYOUT_FAILED");
  },

  async retryPayout(escrowId: string, retriedBy: string): Promise<void> {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (escrow.status !== "PAYOUT_FAILED") {
      throw new UnprocessableError(
        `Cannot retry payout for escrow in status '${escrow.status}'. Must be PAYOUT_FAILED.`,
      );
    }

    assertTransition("PAYOUT_FAILED", "RELEASE_PENDING");

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "RELEASE_PENDING", pendingAt: new Date() },
    });

    logger.info({ escrowId, retriedBy, attempt: (escrow.payoutAttempts ?? 0) + 1 }, "Retrying payout");
    await this.processRelease(escrowId, retriedBy);
  },

  async processPartialSettlement(
    escrowId: string,
    resolvedBy: string,
    splitRatio: number,
  ): Promise<void> {
    if (splitRatio <= 0 || splitRatio >= 1) {
      throw new UnprocessableError("splitRatio must be between 0 and 1 exclusive");
    }

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");

    if (escrow.status !== "DISPUTED") {
      throw new UnprocessableError(
        `Partial settlement only valid from DISPUTED status, got '${escrow.status}'`,
      );
    }

    const professionalShare = Math.floor(escrow.amount * splitRatio);
    const customerRefund = escrow.amount - professionalShare;
    const breakdown = commissionService.calculate(professionalShare, (await commissionService.calculateFromSettings(professionalShare)).commissionRate);
    const netPayout = breakdown.netAmount;

    await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        commissionRate: breakdown.commissionRate,
        commissionAmount: breakdown.commissionAmount,
        netAmount: netPayout,
      },
    });

    await ledgerService.record({
      escrowId,
      type: "COMMISSION",
      amount: breakdown.commissionAmount,
      currency: escrow.currency,
      actorId: resolvedBy,
      description: `Commission on partial settlement (${(splitRatio * 100).toFixed(0)}% to professional)`,
    });

    await ledgerService.record({
      escrowId,
      type: "PAYOUT",
      amount: netPayout,
      currency: escrow.currency,
      actorId: resolvedBy,
      description: `Partial payout to payee ${escrow.payeeId} (${(splitRatio * 100).toFixed(0)}% share, net of commission)`,
      metadata: { splitRatio, gross: professionalShare, commission: breakdown.commissionAmount },
    });

    if (escrow.paymentId && customerRefund > 0) {
      await refundService.initiateRefund({
        paymentId: escrow.paymentId,
        amount: customerRefund,
        reason: "Partial dispute settlement — refund portion",
        requestedBy: resolvedBy,
      });

      await ledgerService.record({
        escrowId,
        type: "REFUND",
        amount: customerRefund,
        currency: escrow.currency,
        actorId: resolvedBy,
        description: `Partial refund to payer ${escrow.payerId} (${((1 - splitRatio) * 100).toFixed(0)}% share)`,
        metadata: { splitRatio, customerRefund },
      });
    }

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "RELEASED", releasedAt: new Date(), resolvedAt: new Date() },
    });

    logger.info(
      { escrowId, resolvedBy, netPayout, customerRefund, splitRatio },
      "Partial dispute settlement complete — RELEASED",
    );
  },
};

import { prisma } from "../config/database.js";
import { transactionService } from "./transaction.service.js";
import { refundService } from "./refund.service.js";
import { ledgerService } from "./ledger.service.js";
import { payoutService } from "./payout.service.js";
import type {
  CreateEscrowDto,
  FundEscrowDto,
  ReleaseEscrowDto,
  RefundEscrowDto,
  DisputeEscrowDto,
  ResolveDisputeDto,
  ChargebackDto,
  RetryPayoutDto,
} from "../types/escrow.types.js";
import {
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from "../middleware/error.middleware.js";
import {
  isEscrowReleasable,
  isEscrowRefundable,
  isEscrowTerminal,
  isEscrowDisputable,
  isEscrowResolvable,
  isPayoutRetryable,
} from "../constants/escrow-status.js";
import { logger } from "../config/logger.js";

export const escrowService = {
  async createEscrow(dto: CreateEscrowDto) {
    const { bookingId, payerId, payeeId, amount, currency = "NGN", releaseConditions, metadata } = dto;

    logger.info({ bookingId, amount }, "Creating escrow");

    const existing = await prisma.escrow.findUnique({ where: { bookingId } });
    if (existing) throw new ConflictError(`Escrow for booking '${bookingId}' already exists`);

    const escrow = await prisma.escrow.create({
      data: {
        bookingId,
        payerId,
        payeeId,
        amount,
        currency,
        status: "CREATED",
        releaseConditions: (releaseConditions ?? {}) as object,
        metadata: (metadata ?? {}) as object,
      },
    });

    logger.info({ escrowId: escrow.id, bookingId }, "Escrow created");
    return escrow;
  },

  async fundEscrow(dto: FundEscrowDto) {
    const { escrowId, paymentId } = dto;

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (escrow.status !== "CREATED") {
      throw new UnprocessableError(`Cannot fund escrow in status '${escrow.status}'`);
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "FUNDED", paymentId },
    });

    await ledgerService.record({
      escrowId,
      type: "FUND",
      amount: escrow.amount,
      currency: escrow.currency,
      description: `Escrow funded via payment ${paymentId}`,
      metadata: { paymentId },
    });

    logger.info({ escrowId, paymentId }, "Escrow funded");
    return updated;
  },

  async holdEscrow(escrowId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (escrow.status !== "FUNDED") {
      throw new UnprocessableError(`Cannot hold escrow in status '${escrow.status}'`);
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "HELD" },
    });

    await ledgerService.record({
      escrowId,
      type: "HOLD",
      amount: escrow.amount,
      currency: escrow.currency,
      description: "Funds held in escrow pending job completion",
    });

    logger.info({ escrowId }, "Escrow held");
    return updated;
  },

  async releaseEscrow(dto: ReleaseEscrowDto) {
    const { escrowId, releasedBy, reason } = dto;

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!isEscrowReleasable(escrow.status)) {
      throw new UnprocessableError(
        `Cannot release escrow in status '${escrow.status}'. Must be HELD.`,
      );
    }

    const pending = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "RELEASE_PENDING",
        pendingAt: new Date(),
        metadata: {
          ...(escrow.metadata as object),
          releasedBy,
          releaseReason: reason,
        },
      },
    });

    logger.info({ escrowId, releasedBy }, "Escrow set to RELEASE_PENDING — initiating payout");

    await payoutService.processRelease(escrowId, releasedBy);

    if (escrow.paymentId) {
      await transactionService.create({
        paymentId: escrow.paymentId,
        type: "ESCROW_RELEASE",
        amount: escrow.amount,
        currency: escrow.currency,
        status: "COMPLETED",
        metadata: { escrowId, releasedBy, reason },
      });
    }

    const released = await prisma.escrow.findUnique({ where: { id: escrowId } });
    return released ?? pending;
  },

  async refundEscrow(dto: RefundEscrowDto) {
    const { escrowId, refundedBy, reason } = dto;

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!isEscrowRefundable(escrow.status)) {
      throw new UnprocessableError(
        `Cannot refund escrow in status '${escrow.status}'. Must be HELD or FUNDED.`,
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        metadata: {
          ...(escrow.metadata as object),
          refundedBy,
          refundReason: reason,
        },
      },
    });

    await ledgerService.record({
      escrowId,
      type: "REFUND",
      amount: escrow.amount,
      currency: escrow.currency,
      actorId: refundedBy,
      description: reason ?? "Escrow refunded to payer",
      metadata: { refundedBy, reason, payerId: escrow.payerId },
    });

    if (escrow.paymentId) {
      await refundService.initiateRefund({
        paymentId: escrow.paymentId,
        reason,
        requestedBy: refundedBy,
      });
    }

    logger.info({ escrowId, refundedBy }, "Escrow refunded to payer");
    return updated;
  },

  async disputeEscrow(dto: DisputeEscrowDto) {
    const { escrowId, disputedBy, reason } = dto;

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!isEscrowDisputable(escrow.status)) {
      throw new UnprocessableError(
        `Cannot dispute escrow in status '${escrow.status}'. Must be HELD.`,
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "DISPUTED",
        disputedAt: new Date(),
        metadata: {
          ...(escrow.metadata as object),
          disputedBy,
          disputeReason: reason,
          disputedAt: new Date().toISOString(),
        },
      },
    });

    await ledgerService.record({
      escrowId,
      type: "DISPUTE_LOCK",
      amount: escrow.amount,
      currency: escrow.currency,
      actorId: disputedBy,
      description: `Funds locked — dispute opened: ${reason}`,
      metadata: { disputedBy, reason },
    });

    logger.warn({ escrowId, disputedBy, reason }, "Escrow disputed — funds locked");
    return updated;
  },

  async resolveDispute(dto: ResolveDisputeDto) {
    const { escrowId, resolvedBy, outcome, splitRatio = 0.5, reason } = dto;

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!isEscrowResolvable(escrow.status)) {
      throw new UnprocessableError(
        `Cannot resolve escrow in status '${escrow.status}'. Must be DISPUTED.`,
      );
    }

    await ledgerService.record({
      escrowId,
      type: "DISPUTE_RESOLVED",
      amount: escrow.amount,
      currency: escrow.currency,
      actorId: resolvedBy,
      description: `Dispute resolved with outcome: ${outcome}${reason ? ` — ${reason}` : ""}`,
      metadata: { resolvedBy, outcome, splitRatio, reason },
    });

    switch (outcome) {
      case "RELEASE": {
        await prisma.escrow.update({
          where: { id: escrowId },
          data: { status: "RELEASE_PENDING", pendingAt: new Date(), resolvedAt: new Date() },
        });
        await payoutService.processRelease(escrowId, resolvedBy);

        if (escrow.paymentId) {
          await transactionService.create({
            paymentId: escrow.paymentId,
            type: "ESCROW_RELEASE",
            amount: escrow.amount,
            currency: escrow.currency,
            status: "COMPLETED",
            metadata: { escrowId, resolvedBy, outcome: "RELEASE", reason },
          });
        }
        break;
      }

      case "REFUND": {
        await prisma.escrow.update({
          where: { id: escrowId },
          data: { status: "REFUNDED", refundedAt: new Date(), resolvedAt: new Date() },
        });

        await ledgerService.record({
          escrowId,
          type: "REFUND",
          amount: escrow.amount,
          currency: escrow.currency,
          actorId: resolvedBy,
          description: `Full refund to payer ${escrow.payerId} — dispute resolved for customer`,
        });

        if (escrow.paymentId) {
          await refundService.initiateRefund({
            paymentId: escrow.paymentId,
            reason: reason ?? "Dispute resolved in customer favour",
            requestedBy: resolvedBy,
          });
        }
        break;
      }

      case "PARTIAL": {
        await payoutService.processPartialSettlement(escrowId, resolvedBy, splitRatio);
        break;
      }

      default: {
        const _exhaustive: never = outcome;
        throw new UnprocessableError(`Unknown dispute outcome: ${_exhaustive}`);
      }
    }

    const resolved = await prisma.escrow.findUnique({ where: { id: escrowId } });
    logger.info({ escrowId, outcome, resolvedBy }, "Dispute resolved");
    return resolved;
  },

  async chargebackEscrow(dto: ChargebackDto) {
    const { escrowId, chargebackId, initiatedBy, reason } = dto;

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!["HELD", "RELEASED"].includes(escrow.status)) {
      throw new UnprocessableError(
        `Cannot raise chargeback for escrow in status '${escrow.status}'. Must be HELD or RELEASED.`,
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "CHARGEBACK",
        chargebackAt: new Date(),
        chargebackId,
        metadata: {
          ...(escrow.metadata as object),
          chargebackId,
          chargebackInitiatedBy: initiatedBy,
          chargebackReason: reason,
          chargebackAt: new Date().toISOString(),
        },
      },
    });

    await ledgerService.record({
      escrowId,
      type: "CHARGEBACK",
      amount: escrow.amount,
      currency: escrow.currency,
      actorId: initiatedBy,
      description: `Chargeback raised: ${chargebackId}${reason ? ` — ${reason}` : ""}`,
      metadata: { chargebackId, initiatedBy, reason },
    });

    logger.warn({ escrowId, chargebackId, initiatedBy }, "Chargeback raised on escrow");
    return updated;
  },

  async retryPayout(dto: RetryPayoutDto) {
    const { escrowId, retriedBy } = dto;

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundError("Escrow");

    if (!isPayoutRetryable(escrow.status)) {
      throw new UnprocessableError(
        `Cannot retry payout for escrow in status '${escrow.status}'. Must be PAYOUT_FAILED.`,
      );
    }

    await payoutService.retryPayout(escrowId, retriedBy);

    const updated = await prisma.escrow.findUnique({ where: { id: escrowId } });
    return updated;
  },

  async getEscrow(id: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");
    return escrow;
  },

  async getEscrowByBooking(bookingId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { bookingId },
      include: { payment: true },
    });
    if (!escrow) throw new NotFoundError("Escrow");
    return escrow;
  },

  async listEscrows(
    filters: { payerId?: string; payeeId?: string; status?: string },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters.payerId && { payerId: filters.payerId }),
      ...(filters.payeeId && { payeeId: filters.payeeId }),
      ...(filters.status && { status: filters.status as import("@prisma/client").EscrowStatus }),
    };
    const [escrows, total] = await Promise.all([
      prisma.escrow.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.escrow.count({ where }),
    ]);
    return { escrows, total, page, limit };
  },

  async isTerminal(id: string): Promise<boolean> {
    const escrow = await prisma.escrow.findUnique({ where: { id } });
    if (!escrow) throw new NotFoundError("Escrow");
    return isEscrowTerminal(escrow.status);
  },
};

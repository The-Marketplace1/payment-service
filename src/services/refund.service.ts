import { prisma } from "../config/database.js";
import { getProvider } from "./provider.service.js";
import { transactionService } from "./transaction.service.js";
import type { InitiateRefundDto, RefundResult } from "../types/payment.types.js";
import {
  NotFoundError,
  AppError,
  UnprocessableError,
} from "../middleware/error.middleware.js";
import { logger } from "../config/logger.js";
import { isRefundable } from "../constants/payment-status.js";

export const refundService = {
  async initiateRefund(dto: InitiateRefundDto): Promise<RefundResult> {
    const { paymentId, amount, reason, requestedBy } = dto;

    logger.info({ paymentId, amount, requestedBy }, "Initiating refund");

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment");

    if (!isRefundable(payment.status)) {
      throw new UnprocessableError(
        `Payment in status '${payment.status}' cannot be refunded`,
      );
    }

    if (!payment.providerRef) {
      throw new UnprocessableError("Payment has no provider reference for refund");
    }

    const refundAmount = amount ?? payment.amount;
    if (refundAmount > payment.amount) {
      throw new AppError("Refund amount cannot exceed payment amount", 400);
    }

    const provider = getProvider(payment.provider);
    const result = await provider.processRefund({
      providerRef: payment.providerRef,
      amount: refundAmount,
      reason,
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    const tx = await transactionService.create({
      paymentId,
      type: "REFUND",
      amount: refundAmount,
      currency: payment.currency,
      status: "COMPLETED",
      metadata: { reason, requestedBy, providerRefundRef: result.providerRefundRef },
    });

    logger.info(
      { paymentId, refundRef: result.providerRefundRef },
      "Refund processed successfully",
    );

    return {
      refundId: tx.id,
      paymentId,
      amount: refundAmount,
      currency: payment.currency,
      status: result.status,
      providerRefundRef: result.providerRefundRef,
    };
  },
};

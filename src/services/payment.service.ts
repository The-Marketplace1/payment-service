import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { getProvider } from "./provider.service.js";
import { transactionService } from "./transaction.service.js";
import { generatePaymentReference } from "../utils/id-generator.js";
import type {
  CreatePaymentDto,
  PaymentIntentResult,
} from "../types/payment.types.js";
import { NotFoundError, AppError } from "../middleware/error.middleware.js";
import { logger } from "../config/logger.js";
import { isRefundable } from "../constants/payment-status.js";

export const paymentService = {
  async initiatePayment(dto: CreatePaymentDto): Promise<PaymentIntentResult> {
    const { userId, amount, currency = "NGN", provider, metadata } = dto;

    logger.info({ userId, amount, provider }, "Initiating payment");

    const reference = generatePaymentReference();

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        status: "PENDING",
        provider,
        reference,
        metadata: (metadata ?? {}) as object,
      },
    });

    await transactionService.create({
      paymentId: payment.id,
      type: "PAYMENT",
      amount,
      currency,
      status: "PENDING",
    });

    const providerInstance = getProvider(provider);
    const result = await providerInstance.createPaymentIntent({
      amount,
      currency,
      reference,
      userId,
      metadata,
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: result.providerRef,
        status: result.status === "completed" ? "COMPLETED" : "PROCESSING",
      },
    });

    return {
      paymentId: payment.id,
      reference: payment.reference,
      providerRef: result.providerRef,
      clientSecret: result.clientSecret,
      authorizationUrl: result.authorizationUrl,
      status: updatedPayment.status,
      amount: payment.amount,
      currency: payment.currency,
    };
  },

  async getPayment(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { transactions: true, escrow: true },
    });
    if (!payment) throw new NotFoundError("Payment");
    return payment;
  },

  async getPaymentByReference(reference: string) {
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { transactions: true },
    });
    if (!payment) throw new NotFoundError("Payment");
    return payment;
  },

  async listPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { transactions: { take: 1, orderBy: { createdAt: "desc" } } },
      }),
      prisma.payment.count({ where: { userId } }),
    ]);
    return { payments, total, page, limit };
  },

  async updateStatus(id: string, status: PaymentStatus) {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status },
    });
    logger.info({ paymentId: id, status }, "Payment status updated");
    return payment;
  },

  async markCompleted(id: string, providerRef?: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: "COMPLETED",
        ...(providerRef && { providerRef }),
      },
    });
  },

  async markFailed(id: string) {
    return prisma.payment.update({
      where: { id },
      data: { status: "FAILED" },
    });
  },
};

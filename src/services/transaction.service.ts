import type {
  TransactionType,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";

export interface CreateTransactionDto {
  paymentId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  status?: TransactionStatus;
  metadata?: Record<string, unknown>;
}

export const transactionService = {
  async create(dto: CreateTransactionDto) {
    const tx = await prisma.transaction.create({
      data: {
        paymentId: dto.paymentId,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency ?? "NGN",
        status: dto.status ?? "PENDING",
        metadata: (dto.metadata ?? {}) as object,
      },
    });
    logger.info({ transactionId: tx.id, type: tx.type }, "Transaction created");
    return tx;
  },

  async updateStatus(id: string, status: TransactionStatus) {
    return prisma.transaction.update({
      where: { id },
      data: { status },
    });
  },

  async findByPayment(paymentId: string) {
    return prisma.transaction.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.transaction.findUnique({ where: { id } });
  },
};

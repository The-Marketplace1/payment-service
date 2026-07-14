import { prisma } from "../../config/database.js";
import type { TransactionType, TransactionStatus } from "@prisma/client";

export const transactionRepository = {
  findAll: (filters: { type?: TransactionType; status?: TransactionStatus }, page = 1, limit = 20) =>
    prisma.transaction.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { payment: { select: { userId: true, provider: true, currency: true } } },
    }),

  countAll: (filters: { type?: TransactionType; status?: TransactionStatus }) =>
    prisma.transaction.count({ where: filters }),

  findById: (id: string) =>
    prisma.transaction.findUnique({
      where: { id },
      include: { payment: true },
    }),

  sumByType: () =>
    prisma.transaction.groupBy({
      by: ["type", "status"],
      _sum: { amount: true },
      _count: { id: true },
    }),
};

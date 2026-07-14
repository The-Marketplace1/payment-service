import { prisma } from "../../config/database.js";
import type { EscrowStatus } from "@prisma/client";

export const escrowRepository = {
  findById: (id: string) =>
    prisma.escrow.findUnique({ where: { id }, include: { payment: true } }),

  findByBookingId: (bookingId: string) =>
    prisma.escrow.findUnique({ where: { bookingId }, include: { payment: true } }),

  findByPayer: (payerId: string, page = 1, limit = 20) =>
    prisma.escrow.findMany({
      where: { payerId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),

  findByPayee: (payeeId: string, page = 1, limit = 20) =>
    prisma.escrow.findMany({
      where: { payeeId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),

  findByStatus: (status: EscrowStatus) =>
    prisma.escrow.findMany({ where: { status } }),

  countByStatus: () =>
    prisma.escrow.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
};

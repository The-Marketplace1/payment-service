import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import type { CreateLedgerEntryDto, LedgerSummary } from "../types/ledger.types.js";
import type { LedgerEntryType } from "@prisma/client";

export const ledgerService = {
  async record(dto: CreateLedgerEntryDto) {
    const entry = await prisma.ledgerEntry.create({
      data: {
        escrowId: dto.escrowId,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency,
        actorId: dto.actorId,
        description: dto.description,
        metadata: (dto.metadata ?? {}) as object,
      },
    });

    logger.info(
      { ledgerId: entry.id, escrowId: dto.escrowId, type: dto.type, amount: dto.amount },
      "Ledger entry recorded",
    );

    return entry;
  },

  async getEntriesForEscrow(escrowId: string) {
    return prisma.ledgerEntry.findMany({
      where: { escrowId },
      orderBy: { createdAt: "asc" },
    });
  },

  async getSummary(escrowId: string): Promise<LedgerSummary> {
    const entries = await prisma.ledgerEntry.findMany({
      where: { escrowId },
    });

    const sum = (type: LedgerEntryType) =>
      entries.filter((e) => e.type === type).reduce((acc, e) => acc + e.amount, 0);

    return {
      escrowId,
      gross: sum("FUND"),
      commission: sum("COMMISSION"),
      net: sum("PAYOUT"),
      refunded: sum("REFUND"),
      entries: entries.length,
    };
  },
};

import type { LedgerEntryType } from "@prisma/client";

export interface CreateLedgerEntryDto {
  escrowId: string;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  actorId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerSummary {
  escrowId: string;
  gross: number;
  commission: number;
  net: number;
  refunded: number;
  entries: number;
}

import type { EscrowStatus } from "@prisma/client";

export interface CreateEscrowDto {
  bookingId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency?: string;
  releaseConditions?: ReleaseConditions;
  metadata?: Record<string, unknown>;
}

export interface ReleaseConditions {
  requiresCompletion?: boolean;
  autoReleaseAfterDays?: number;
  requiresApproval?: boolean;
}

export interface FundEscrowDto {
  escrowId: string;
  paymentId: string;
}

export interface ReleaseEscrowDto {
  escrowId: string;
  releasedBy: string;
  reason?: string;
}

export interface RefundEscrowDto {
  escrowId: string;
  refundedBy: string;
  reason?: string;
}

export interface DisputeEscrowDto {
  escrowId: string;
  disputedBy: string;
  reason: string;
}

export interface ResolveDisputeDto {
  escrowId: string;
  resolvedBy: string;
  outcome: "RELEASE" | "REFUND" | "PARTIAL";
  splitRatio?: number;
  reason?: string;
}

export interface EscrowStateTransition {
  from: EscrowStatus;
  to: EscrowStatus;
  allowedActors?: string[];
}

export interface ChargebackDto {
  escrowId: string;
  chargebackId: string;
  initiatedBy: string;
  reason?: string;
}

export interface RetryPayoutDto {
  escrowId: string;
  retriedBy: string;
}

export const ESCROW_TRANSITIONS: EscrowStateTransition[] = [
  // Normal flow
  { from: "CREATED", to: "FUNDED" },
  { from: "FUNDED", to: "HELD" },
  // Release flow (via payout)
  { from: "HELD", to: "RELEASE_PENDING" },
  { from: "RELEASE_PENDING", to: "RELEASED" },
  { from: "RELEASE_PENDING", to: "PAYOUT_FAILED" },
  { from: "PAYOUT_FAILED", to: "RELEASE_PENDING" },   // retry
  // Refund flow — direct (sync) or via REFUND_PENDING (async)
  { from: "FUNDED", to: "REFUND_PENDING" },
  { from: "FUNDED", to: "REFUNDED" },
  { from: "HELD", to: "REFUND_PENDING" },
  { from: "HELD", to: "REFUNDED" },
  { from: "REFUND_PENDING", to: "REFUNDED" },
  // Dispute flow
  { from: "HELD", to: "DISPUTED" },
  { from: "DISPUTED", to: "RELEASE_PENDING" },
  { from: "DISPUTED", to: "REFUND_PENDING" },
  { from: "DISPUTED", to: "REFUNDED" },
  { from: "DISPUTED", to: "RELEASED" },               // partial settlement terminal
  // Chargeback
  { from: "HELD", to: "CHARGEBACK" },
  { from: "RELEASED", to: "CHARGEBACK" },
  // Expiry
  { from: "FUNDED", to: "EXPIRED" },
  { from: "HELD", to: "EXPIRED" },
];

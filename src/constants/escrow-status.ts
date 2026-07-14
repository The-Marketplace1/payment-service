export const ESCROW_STATUS = {
  CREATED: "CREATED",
  FUNDED: "FUNDED",
  HELD: "HELD",
  RELEASE_PENDING: "RELEASE_PENDING",
  PAYOUT_FAILED: "PAYOUT_FAILED",
  RELEASED: "RELEASED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
  CHARGEBACK: "CHARGEBACK",
  EXPIRED: "EXPIRED",
} as const;

export type EscrowStatusValue = (typeof ESCROW_STATUS)[keyof typeof ESCROW_STATUS];

export const TERMINAL_ESCROW_STATUSES = [
  ESCROW_STATUS.RELEASED,
  ESCROW_STATUS.REFUNDED,
  ESCROW_STATUS.EXPIRED,
  ESCROW_STATUS.CHARGEBACK,
] as const;

export const RELEASABLE_ESCROW_STATUSES = [
  ESCROW_STATUS.HELD,
] as const;

export const REFUNDABLE_ESCROW_STATUSES = [
  ESCROW_STATUS.HELD,
  ESCROW_STATUS.FUNDED,
  ESCROW_STATUS.REFUND_PENDING,
] as const;

export const DISPUTABLE_ESCROW_STATUSES = [
  ESCROW_STATUS.HELD,
] as const;

export const RESOLVABLE_ESCROW_STATUSES = [
  ESCROW_STATUS.DISPUTED,
] as const;

export const RETRYABLE_PAYOUT_STATUSES = [
  ESCROW_STATUS.PAYOUT_FAILED,
] as const;

export const EXPIRABLE_ESCROW_STATUSES = [
  ESCROW_STATUS.FUNDED,
  ESCROW_STATUS.HELD,
] as const;

export function isEscrowReleasable(status: string): boolean {
  return RELEASABLE_ESCROW_STATUSES.includes(status as typeof RELEASABLE_ESCROW_STATUSES[number]);
}

export function isEscrowRefundable(status: string): boolean {
  return REFUNDABLE_ESCROW_STATUSES.includes(status as typeof REFUNDABLE_ESCROW_STATUSES[number]);
}

export function isEscrowDisputable(status: string): boolean {
  return DISPUTABLE_ESCROW_STATUSES.includes(status as typeof DISPUTABLE_ESCROW_STATUSES[number]);
}

export function isEscrowResolvable(status: string): boolean {
  return RESOLVABLE_ESCROW_STATUSES.includes(status as typeof RESOLVABLE_ESCROW_STATUSES[number]);
}

export function isEscrowTerminal(status: string): boolean {
  return TERMINAL_ESCROW_STATUSES.includes(status as typeof TERMINAL_ESCROW_STATUSES[number]);
}

export function isPayoutRetryable(status: string): boolean {
  return RETRYABLE_PAYOUT_STATUSES.includes(status as typeof RETRYABLE_PAYOUT_STATUSES[number]);
}

export function isEscrowExpirable(status: string): boolean {
  return EXPIRABLE_ESCROW_STATUSES.includes(status as typeof EXPIRABLE_ESCROW_STATUSES[number]);
}

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export const TERMINAL_PAYMENT_STATUSES = [
  PAYMENT_STATUS.COMPLETED,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.REFUNDED,
] as const;

export const REFUNDABLE_PAYMENT_STATUSES = [
  PAYMENT_STATUS.COMPLETED,
] as const;

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_PAYMENT_STATUSES.includes(status as typeof TERMINAL_PAYMENT_STATUSES[number]);
}

export function isRefundable(status: string): boolean {
  return REFUNDABLE_PAYMENT_STATUSES.includes(status as typeof REFUNDABLE_PAYMENT_STATUSES[number]);
}

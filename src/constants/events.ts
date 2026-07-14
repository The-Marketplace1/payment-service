export const INTERNAL_EVENTS = {
  PAYMENT_INITIATED: "payment.initiated",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  PAYMENT_REFUNDED: "payment.refunded",

  ESCROW_CREATED: "escrow.created",
  ESCROW_FUNDED: "escrow.funded",
  ESCROW_HELD: "escrow.held",
  ESCROW_RELEASED: "escrow.released",
  ESCROW_REFUNDED: "escrow.refunded",
  ESCROW_DISPUTED: "escrow.disputed",

  REFUND_INITIATED: "refund.initiated",
  REFUND_COMPLETED: "refund.completed",
  REFUND_FAILED: "refund.failed",
} as const;

export const INBOUND_EVENTS = {
  BOOKING_CREATED: "booking.created",
  BOOKING_COMPLETED: "booking.completed",
  BOOKING_CANCELLED: "booking.cancelled",
} as const;

export const PROVIDER_EVENTS = {
  STRIPE: {
    PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
    PAYMENT_INTENT_FAILED: "payment_intent.payment_failed",
    CHARGE_REFUNDED: "charge.refunded",
    CHECKOUT_COMPLETED: "checkout.session.completed",
  },
  PAYSTACK: {
    CHARGE_SUCCESS: "charge.success",
    TRANSFER_SUCCESS: "transfer.success",
    TRANSFER_FAILED: "transfer.failed",
    REFUND_PROCESSED: "refund.processed",
  },
  FLUTTERWAVE: {
    CHARGE_COMPLETED: "charge.completed",
    TRANSFER_COMPLETED: "transfer.completed",
    REFUND_COMPLETED: "refund.completed",
  },
} as const;

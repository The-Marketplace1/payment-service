import { env } from "./env.js";

export const CONSTANTS = {
  SERVICE_NAME: "payment-service",
  API_VERSION: "v1",
  API_PREFIX: "/api/v1",

  ESCROW: {
    AUTO_RELEASE_DAYS: env.ESCROW_AUTO_RELEASE_DAYS,
    DISPUTE_WINDOW_HOURS: env.ESCROW_DISPUTE_WINDOW_HOURS,
  },

  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100,
    WEBHOOK_MAX: 500,
  },

  QUEUES: {
    ESCROW_PROCESSING: "escrow-processing",
    WEBHOOK_PROCESSING: "webhook-processing",
    REFUND_PROCESSING: "refund-processing",
  },

  JOBS: {
    FUND_ESCROW: "fund-escrow",
    RELEASE_ESCROW: "release-escrow",
    REFUND_ESCROW: "refund-escrow",
    DISPUTE_ESCROW: "dispute-escrow",
    PROCESS_WEBHOOK: "process-webhook",
    PROCESS_REFUND: "process-refund",
  },
} as const;

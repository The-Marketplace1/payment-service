import type { PaymentProvider } from "@prisma/client";

export interface IncomingWebhookEvent {
  provider: PaymentProvider;
  eventType: string;
  payload: Record<string, unknown>;
  rawBody: Buffer | string;
  signature?: string;
  idempotencyKey?: string;
}

export interface WebhookProcessResult {
  processed: boolean;
  message: string;
  logId?: string;
}

export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
}

export interface PaystackWebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export interface FlutterwaveWebhookPayload {
  event: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export type WebhookPayload =
  | StripeWebhookPayload
  | PaystackWebhookPayload
  | FlutterwaveWebhookPayload;

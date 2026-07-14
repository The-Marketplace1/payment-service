import type { ProviderPaymentResult } from "../types/payment.types.js";

export interface CreatePaymentIntentOptions {
  amount: number;
  currency: string;
  reference: string;
  userId: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
}

export interface ProcessRefundOptions {
  providerRef: string;
  amount?: number;
  reason?: string;
}

export interface VerifyWebhookOptions {
  rawBody: Buffer | string;
  signature: string;
  secret: string;
}

export interface ProviderRefundResult {
  providerRefundRef: string;
  amount: number;
  currency: string;
  status: string;
}

// ─── Normalized webhook event — provider-agnostic internal contract ────────────
export type NormalizedWebhookEventType =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "REFUND_COMPLETED"
  | "TRANSFER_COMPLETED"
  | "TRANSFER_FAILED"
  | "UNHANDLED";

export interface NormalizedWebhookEvent {
  type: NormalizedWebhookEventType;
  /** Our internal payment reference */
  reference?: string;
  /** Provider's own transaction/payment ID */
  providerRef?: string;
  amount?: number;
  currency?: string;
  raw?: Record<string, unknown>;
}

// ─── Abstract base — every provider must implement this interface ──────────────
export abstract class BasePaymentProvider {
  /** DB-enum key used to identify this provider (e.g. "STRIPE") */
  abstract readonly providerKey: string;

  /** Human-readable lowercase name (e.g. "stripe") */
  abstract readonly name: string;

  abstract createPaymentIntent(
    options: CreatePaymentIntentOptions,
  ): Promise<ProviderPaymentResult>;

  abstract processRefund(
    options: ProcessRefundOptions,
  ): Promise<ProviderRefundResult>;

  abstract verifyWebhookSignature(options: VerifyWebhookOptions): boolean;

  abstract parseWebhookEvent(payload: unknown): {
    eventType: string;
    data: Record<string, unknown>;
  };

  /**
   * Translate a raw provider event into a provider-agnostic NormalizedWebhookEvent.
   * The webhook.service delegates entirely to this — no provider-specific code lives there.
   */
  abstract normalizeEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): NormalizedWebhookEvent;
}

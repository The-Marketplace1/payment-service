import type { PaymentProvider, PaymentStatus } from "@prisma/client";

export interface CreatePaymentDto {
  userId: string;
  amount: number;
  currency?: string;
  provider: PaymentProvider;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface PaymentIntentResult {
  paymentId: string;
  reference: string;
  providerRef?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

export interface ProviderPaymentResult {
  providerRef: string;
  clientSecret?: string;
  authorizationUrl?: string;
  status: "pending" | "completed" | "failed";
  rawResponse?: unknown;
}

export interface InitiateRefundDto {
  paymentId: string;
  amount?: number;
  reason?: string;
  requestedBy: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  providerRefundRef?: string;
}

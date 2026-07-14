import Stripe from "stripe";
import { BasePaymentProvider } from "./base.provider.js";
import type {
  CreatePaymentIntentOptions,
  ProcessRefundOptions,
  VerifyWebhookOptions,
  ProviderRefundResult,
  NormalizedWebhookEvent,
} from "./base.provider.js";
import type { ProviderPaymentResult } from "../types/payment.types.js";
import { getStripe, providerConfig } from "../config/payment-providers.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error.middleware.js";

export class StripeProvider extends BasePaymentProvider {
  readonly providerKey = "STRIPE";
  readonly name = "stripe";

  private get client(): Stripe {
    return getStripe();
  }

  async createPaymentIntent(
    options: CreatePaymentIntentOptions,
  ): Promise<ProviderPaymentResult> {
    const { amount, currency, reference, userId, metadata } = options;

    logger.info({ reference, amount, currency }, "Creating Stripe payment intent");

    const intent = await this.client.paymentIntents.create(
      {
        amount,
        currency: currency.toLowerCase(),
        metadata: {
          reference,
          userId,
          ...(metadata as Record<string, string>),
        },
      },
      { idempotencyKey: reference },
    );

    return {
      providerRef: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: intent.status === "succeeded" ? "completed" : "pending",
      rawResponse: intent,
    };
  }

  async processRefund(
    options: ProcessRefundOptions,
  ): Promise<ProviderRefundResult> {
    const { providerRef, amount, reason } = options;

    logger.info({ providerRef, amount }, "Processing Stripe refund");

    const refund = await this.client.refunds.create({
      payment_intent: providerRef,
      ...(amount !== undefined && { amount }),
      ...(reason && { reason: reason as Stripe.RefundCreateParams.Reason }),
    });

    return {
      providerRefundRef: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status ?? "pending",
    };
  }

  verifyWebhookSignature(options: VerifyWebhookOptions): boolean {
    const { rawBody, signature, secret } = options;
    try {
      this.client.webhooks.constructEvent(rawBody, signature, secret);
      return true;
    } catch {
      return false;
    }
  }

  constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    const secret = providerConfig.stripe.webhookSecret;
    if (!secret) throw new AppError("Stripe webhook secret not configured", 500);
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }

  parseWebhookEvent(payload: unknown): {
    eventType: string;
    data: Record<string, unknown>;
  } {
    const event = payload as Stripe.Event;
    return {
      eventType: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    };
  }

  normalizeEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): NormalizedWebhookEvent {
    switch (eventType) {
      case "payment_intent.succeeded": {
        const pi = data as { id?: string; metadata?: { reference?: string }; amount?: number; currency?: string };
        return {
          type: "PAYMENT_SUCCEEDED",
          reference: pi.metadata?.reference,
          providerRef: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          raw: data,
        };
      }
      case "payment_intent.payment_failed": {
        const pi = data as { id?: string; metadata?: { reference?: string } };
        return {
          type: "PAYMENT_FAILED",
          reference: pi.metadata?.reference,
          providerRef: pi.id,
          raw: data,
        };
      }
      case "charge.refunded": {
        const charge = data as { id?: string; amount_refunded?: number; currency?: string; payment_intent?: string };
        return {
          type: "REFUND_COMPLETED",
          providerRef: charge.payment_intent ?? charge.id,
          amount: charge.amount_refunded,
          currency: charge.currency,
          raw: data,
        };
      }
      case "transfer.created":
      case "payout.paid": {
        return { type: "TRANSFER_COMPLETED", raw: data };
      }
      case "payout.failed": {
        return { type: "TRANSFER_FAILED", raw: data };
      }
      default:
        return { type: "UNHANDLED", raw: data };
    }
  }
}

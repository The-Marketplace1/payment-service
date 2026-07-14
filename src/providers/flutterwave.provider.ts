import axios from "axios";
import { BasePaymentProvider } from "./base.provider.js";
import type {
  CreatePaymentIntentOptions,
  ProcessRefundOptions,
  VerifyWebhookOptions,
  ProviderRefundResult,
  NormalizedWebhookEvent,
} from "./base.provider.js";
import type { ProviderPaymentResult } from "../types/payment.types.js";
import { providerConfig } from "../config/payment-providers.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error.middleware.js";

export class FlutterwaveProvider extends BasePaymentProvider {
  readonly providerKey = "FLUTTERWAVE";
  readonly name = "flutterwave";

  private get baseUrl(): string {
    return providerConfig.flutterwave.baseUrl;
  }

  private get secretKey(): string {
    if (!providerConfig.flutterwave.secretKey) {
      throw new AppError("Flutterwave secret key not configured", 500);
    }
    return providerConfig.flutterwave.secretKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async createPaymentIntent(
    options: CreatePaymentIntentOptions,
  ): Promise<ProviderPaymentResult> {
    const { amount, currency, reference, userId, metadata, returnUrl } = options;

    logger.info({ reference, amount, currency }, "Creating Flutterwave payment");

    const response = await axios.post(
      `${this.baseUrl}/payments`,
      {
        tx_ref: reference,
        amount: amount / 100,
        currency: currency.toUpperCase(),
        redirect_url: returnUrl ?? "https://example.com/payment/callback",
        meta: { userId, ...metadata },
        customer: { id: userId },
      },
      { headers: this.headers },
    );

    const data = response.data?.data;
    return {
      providerRef: data?.reference ?? reference,
      authorizationUrl: data?.link,
      status: "pending",
      rawResponse: response.data,
    };
  }

  async processRefund(
    options: ProcessRefundOptions,
  ): Promise<ProviderRefundResult> {
    const { providerRef, amount } = options;

    logger.info({ providerRef, amount }, "Processing Flutterwave refund");

    const response = await axios.post(
      `${this.baseUrl}/transactions/${providerRef}/refund`,
      { amount: amount !== undefined ? amount / 100 : undefined },
      { headers: this.headers },
    );

    const data = response.data?.data;
    return {
      providerRefundRef: data?.id?.toString() ?? providerRef,
      amount: data?.amount_refunded ?? amount ?? 0,
      currency: data?.currency ?? "NGN",
      status: data?.status ?? "pending",
    };
  }

  verifyWebhookSignature(options: VerifyWebhookOptions): boolean {
    const { signature, secret } = options;
    return signature === secret;
  }

  parseWebhookEvent(payload: unknown): {
    eventType: string;
    data: Record<string, unknown>;
  } {
    const event = payload as { event: string; data: Record<string, unknown> };
    return {
      eventType: event.event,
      data: event.data,
    };
  }

  normalizeEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): NormalizedWebhookEvent {
    switch (eventType) {
      case "charge.completed": {
        const charge = data as {
          tx_ref?: string;
          id?: number;
          status?: string;
          amount?: number;
          currency?: string;
          flw_ref?: string;
        };
        if (charge.status !== "successful") {
          return { type: "PAYMENT_FAILED", reference: charge.tx_ref, raw: data };
        }
        return {
          type: "PAYMENT_SUCCEEDED",
          reference: charge.tx_ref,
          providerRef: charge.flw_ref ?? charge.id?.toString(),
          amount: charge.amount,
          currency: charge.currency,
          raw: data,
        };
      }
      case "refund.completed": {
        const refund = data as { tx_ref?: string; amount?: number; currency?: string };
        return {
          type: "REFUND_COMPLETED",
          reference: refund.tx_ref,
          amount: refund.amount,
          currency: refund.currency,
          raw: data,
        };
      }
      case "transfer.completed": {
        return { type: "TRANSFER_COMPLETED", raw: data };
      }
      case "transfer.failed": {
        return { type: "TRANSFER_FAILED", raw: data };
      }
      default:
        return { type: "UNHANDLED", raw: data };
    }
  }
}

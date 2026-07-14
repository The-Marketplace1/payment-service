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
import { verifyHmacSignature } from "../utils/crypto.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error.middleware.js";

export class PaystackProvider extends BasePaymentProvider {
  readonly providerKey = "PAYSTACK";
  readonly name = "paystack";

  private get baseUrl(): string {
    return providerConfig.paystack.baseUrl;
  }

  private get secretKey(): string {
    if (!providerConfig.paystack.secretKey) {
      throw new AppError("Paystack secret key not configured", 500);
    }
    return providerConfig.paystack.secretKey;
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

    logger.info({ reference, amount, currency }, "Initializing Paystack transaction");

    const response = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      {
        amount,
        currency: currency.toUpperCase(),
        reference,
        metadata: { userId, ...metadata },
        ...(returnUrl && { callback_url: returnUrl }),
      },
      { headers: this.headers },
    );

    const data = response.data?.data;
    return {
      providerRef: data.reference,
      authorizationUrl: data.authorization_url,
      status: "pending",
      rawResponse: response.data,
    };
  }

  async processRefund(
    options: ProcessRefundOptions,
  ): Promise<ProviderRefundResult> {
    const { providerRef, amount } = options;

    logger.info({ providerRef, amount }, "Processing Paystack refund");

    const response = await axios.post(
      `${this.baseUrl}/refund`,
      {
        transaction: providerRef,
        ...(amount !== undefined && { amount }),
      },
      { headers: this.headers },
    );

    const data = response.data?.data;
    return {
      providerRefundRef: data.id?.toString() ?? providerRef,
      amount: data.amount ?? amount ?? 0,
      currency: data.currency ?? "NGN",
      status: data.status ?? "pending",
    };
  }

  verifyWebhookSignature(options: VerifyWebhookOptions): boolean {
    const { rawBody, signature, secret } = options;
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    return verifyHmacSignature(body, signature, secret);
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
      case "charge.success": {
        const charge = data as { reference?: string; id?: string; amount?: number; currency?: string };
        return {
          type: "PAYMENT_SUCCEEDED",
          reference: charge.reference,
          providerRef: charge.id?.toString(),
          amount: charge.amount,
          currency: charge.currency,
          raw: data,
        };
      }
      case "charge.failed": {
        const charge = data as { reference?: string };
        return {
          type: "PAYMENT_FAILED",
          reference: charge.reference,
          raw: data,
        };
      }
      case "refund.processed": {
        const refund = data as { transaction_reference?: string; amount?: number; currency?: string };
        return {
          type: "REFUND_COMPLETED",
          reference: refund.transaction_reference,
          amount: refund.amount,
          currency: refund.currency,
          raw: data,
        };
      }
      case "transfer.success": {
        return { type: "TRANSFER_COMPLETED", raw: data };
      }
      case "transfer.failed":
      case "transfer.reversed": {
        return { type: "TRANSFER_FAILED", raw: data };
      }
      default:
        return { type: "UNHANDLED", raw: data };
    }
  }
}

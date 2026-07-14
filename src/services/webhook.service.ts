import type { PaymentProvider } from "@prisma/client";
import { prisma } from "../config/database.js";
import { getProvider } from "./provider.service.js";
import { paymentService } from "./payment.service.js";
import { escrowService } from "./escrow.service.js";
import type {
  IncomingWebhookEvent,
  WebhookProcessResult,
} from "../types/webhook.types.js";
import type { NormalizedWebhookEvent } from "../providers/base.provider.js";
import { generateWebhookIdempotencyKey } from "../utils/id-generator.js";
import { logger } from "../config/logger.js";

export const webhookService = {
  async processWebhook(event: IncomingWebhookEvent): Promise<WebhookProcessResult> {
    const { provider, eventType, payload, idempotencyKey } = event;

    const key =
      idempotencyKey ??
      generateWebhookIdempotencyKey(provider, JSON.stringify(payload).slice(0, 64));

    const existing = await prisma.webhookLog.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing && existing.status === "PROCESSED") {
      logger.info({ key, provider }, "Duplicate webhook skipped");
      return { processed: false, message: "Duplicate event", logId: existing.id };
    }

    const log = await prisma.webhookLog.upsert({
      where: { idempotencyKey: key },
      update: {},
      create: {
        provider,
        eventType,
        payload: payload as object,
        status: "PENDING",
        idempotencyKey: key,
      },
    });

    try {
      // ── Delegate entirely to the provider — no provider-specific code here ──
      const providerInstance = getProvider(provider);
      const normalized = providerInstance.normalizeEvent(eventType, payload);
      await this.handleNormalizedEvent(normalized);

      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });

      logger.info({ provider, eventType, normalized: normalized.type }, "Webhook processed");
      return { processed: true, message: "Event processed", logId: log.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: "FAILED", error },
      });
      logger.error({ err, provider, eventType }, "Webhook processing failed");
      throw err;
    }
  },

  /**
   * Provider-agnostic event handler.
   * New event types are added here — this is the ONLY place that
   * maps normalized event types to internal business logic.
   */
  async handleNormalizedEvent(event: NormalizedWebhookEvent): Promise<void> {
    switch (event.type) {
      case "PAYMENT_SUCCEEDED": {
        if (!event.reference) break;
        const payment = await prisma.payment.findUnique({
          where: { reference: event.reference },
        });
        if (!payment) {
          logger.warn({ reference: event.reference }, "Payment not found for PAYMENT_SUCCEEDED");
          break;
        }
        await paymentService.markCompleted(payment.id, event.providerRef);
        const escrow = await prisma.escrow.findUnique({
          where: { paymentId: payment.id },
        });
        if (escrow && escrow.status === "FUNDED") {
          await escrowService.holdEscrow(escrow.id);
        }
        break;
      }

      case "PAYMENT_FAILED": {
        if (!event.reference) break;
        const payment = await prisma.payment.findUnique({
          where: { reference: event.reference },
        });
        if (payment) {
          await paymentService.markFailed(payment.id);
        }
        break;
      }

      case "REFUND_COMPLETED": {
        logger.info({ ref: event.reference, providerRef: event.providerRef }, "Refund confirmed by provider");
        break;
      }

      case "TRANSFER_COMPLETED": {
        logger.info({ raw: event.raw }, "Transfer/payout confirmed by provider");
        break;
      }

      case "TRANSFER_FAILED": {
        logger.warn({ raw: event.raw }, "Transfer/payout failed at provider");
        break;
      }

      case "UNHANDLED": {
        logger.debug({ raw: event.raw }, "Unhandled provider event — skipped");
        break;
      }

      default: {
        const _exhaustive: never = event.type;
        logger.warn({ type: _exhaustive }, "Unknown normalized event type");
      }
    }
  },

  // ─── Legacy adapter — kept for direct calls from queue jobs ──────────────────
  async handleProviderEvent(
    provider: PaymentProvider,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const providerInstance = getProvider(provider);
    const normalized = providerInstance.normalizeEvent(eventType, payload);
    await this.handleNormalizedEvent(normalized);
  },
};

import type { Request, Response } from "express";
import { webhookService } from "../../services/webhook.service.js";
import { StripeProvider } from "../../providers/stripe.provider.js";
import { providerConfig } from "../../config/payment-providers.js";
import { verifyHmacSignature } from "../../utils/crypto.js";
import { generateWebhookIdempotencyKey } from "../../utils/id-generator.js";
import { sendSuccess, sendError, sendForbidden } from "../../utils/response.js";
import { logger } from "../../config/logger.js";

export const webhookController = {
  async handleStripe(req: Request, res: Response): Promise<void> {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
      sendForbidden(res, "Missing Stripe signature");
      return;
    }

    let parsedEvent: { type: string; data: { object: Record<string, unknown> }; id: string };
    try {
      const stripeProvider = new StripeProvider();
      parsedEvent = stripeProvider.constructWebhookEvent(req.body as Buffer, signature) as unknown as typeof parsedEvent;
    } catch (err) {
      logger.warn({ err }, "Invalid Stripe webhook signature");
      sendForbidden(res, "Invalid Stripe signature");
      return;
    }

    const result = await webhookService.processWebhook({
      provider: "STRIPE",
      eventType: parsedEvent.type,
      payload: parsedEvent.data.object,
      rawBody: req.body as Buffer,
      signature,
      idempotencyKey: generateWebhookIdempotencyKey("STRIPE", parsedEvent.id),
    });

    sendSuccess(res, result);
  },

  async handlePaystack(req: Request, res: Response): Promise<void> {
    const signature = req.headers["x-paystack-signature"] as string;
    const secret = providerConfig.paystack.secretKey;

    if (!secret) {
      sendError(res, "Paystack not configured", 500);
      return;
    }

    const rawBody = JSON.stringify(req.body);
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      sendForbidden(res, "Invalid Paystack signature");
      return;
    }

    const payload = req.body as { event: string; data: Record<string, unknown> };
    const result = await webhookService.processWebhook({
      provider: "PAYSTACK",
      eventType: payload.event,
      payload: payload.data,
      rawBody,
      signature,
      idempotencyKey: generateWebhookIdempotencyKey("PAYSTACK", JSON.stringify(payload.data).slice(0, 64)),
    });

    sendSuccess(res, result);
  },

  async handleFlutterwave(req: Request, res: Response): Promise<void> {
    const signature = req.headers["verif-hash"] as string;
    const secret = providerConfig.flutterwave.secretKey;

    if (!secret || signature !== secret) {
      sendForbidden(res, "Invalid Flutterwave signature");
      return;
    }

    const payload = req.body as { event: string; data: Record<string, unknown> };
    const result = await webhookService.processWebhook({
      provider: "FLUTTERWAVE",
      eventType: payload.event,
      payload: payload.data,
      rawBody: JSON.stringify(payload),
      signature,
      idempotencyKey: generateWebhookIdempotencyKey(
        "FLUTTERWAVE",
        String((payload.data as { id?: unknown })?.id ?? JSON.stringify(payload.data).slice(0, 32)),
      ),
    });

    sendSuccess(res, result);
  },
};

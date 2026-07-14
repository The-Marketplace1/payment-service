import Stripe from "stripe";
import { env } from "./env.js";
import { logger } from "./logger.js";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
    logger.info("Stripe client initialized");
  }
  return stripeInstance;
}

export const providerConfig = {
  stripe: {
    enabled: !!env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  paystack: {
    enabled: !!env.PAYSTACK_SECRET_KEY,
    secretKey: env.PAYSTACK_SECRET_KEY,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
    baseUrl: "https://api.paystack.co",
  },
  flutterwave: {
    enabled: !!env.FLUTTERWAVE_SECRET_KEY,
    secretKey: env.FLUTTERWAVE_SECRET_KEY,
    publicKey: env.FLUTTERWAVE_PUBLIC_KEY,
    encryptionKey: env.FLUTTERWAVE_ENCRYPTION_KEY,
    baseUrl: "https://api.flutterwave.com/v3",
  },
} as const;

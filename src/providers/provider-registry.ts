/**
 * PROVIDER REGISTRY — single source of truth for all payment providers.
 *
 * To add a new provider:
 *   1. Create src/providers/<name>.provider.ts extending BasePaymentProvider
 *   2. Add its env keys to src/config/env.ts and payment-providers.ts
 *   3. Add ONE entry to PROVIDER_REGISTRY below
 *   4. Add its DB enum key to ALL_PROVIDER_KEYS below
 *   5. Run `pnpm db:generate` after adding it to the Prisma PaymentProvider enum
 *
 * ─── No other files need to change ───────────────────────────────────────────
 */

import { StripeProvider } from "./stripe.provider.js";
import { PaystackProvider } from "./paystack.provider.js";
import { FlutterwaveProvider } from "./flutterwave.provider.js";
import { providerConfig } from "../config/payment-providers.js";
import type { BasePaymentProvider } from "./base.provider.js";

// ─── 1. Add new provider key here ────────────────────────────────────────────
export const ALL_PROVIDER_KEYS = [
  "STRIPE",
  "PAYSTACK",
  "FLUTTERWAVE",
] as const;

export type ProviderKey = typeof ALL_PROVIDER_KEYS[number];

// ─── 2. Add new provider factory here ────────────────────────────────────────
export const PROVIDER_REGISTRY: ReadonlyArray<{
  key: ProviderKey;
  factory: () => BasePaymentProvider;
  enabled: () => boolean;
}> = [
  {
    key: "STRIPE",
    factory: () => new StripeProvider(),
    enabled: () => !!providerConfig.stripe.enabled,
  },
  {
    key: "PAYSTACK",
    factory: () => new PaystackProvider(),
    enabled: () => !!providerConfig.paystack.enabled,
  },
  {
    key: "FLUTTERWAVE",
    factory: () => new FlutterwaveProvider(),
    enabled: () => !!providerConfig.flutterwave.enabled,
  },
];

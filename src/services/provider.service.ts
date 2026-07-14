import { PROVIDER_REGISTRY, type ProviderKey } from "../providers/provider-registry.js";
import type { BasePaymentProvider } from "../providers/base.provider.js";
import { AppError } from "../middleware/error.middleware.js";

// ─── Provider map — built from registry at startup ────────────────────────────
const providers = new Map<string, BasePaymentProvider>();

function initProviders(): void {
  for (const entry of PROVIDER_REGISTRY) {
    if (entry.enabled()) {
      providers.set(entry.key, entry.factory());
    }
  }
}

initProviders();

// ─── Public API ───────────────────────────────────────────────────────────────

export function getProvider(providerKey: string): BasePaymentProvider {
  const instance = providers.get(providerKey);
  if (!instance) {
    throw new AppError(
      `Payment provider '${providerKey}' is not configured or not enabled`,
      422,
    );
  }
  return instance;
}

/** Keys of currently-enabled providers (e.g. ["PAYSTACK"] in dev without Stripe keys). */
export function getAvailableProviders(): string[] {
  return Array.from(providers.keys());
}

/** All known provider keys from registry — used by validators to accept any registered provider. */
export function getAllProviderKeys(): string[] {
  return PROVIDER_REGISTRY.map((p) => p.key);
}

export function isProviderAvailable(providerKey: string): boolean {
  return providers.has(providerKey);
}

export type { ProviderKey };

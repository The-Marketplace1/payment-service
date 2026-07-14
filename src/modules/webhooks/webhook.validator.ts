import { z } from "zod";
import { ALL_PROVIDER_KEYS } from "../../providers/provider-registry.js";

export const WebhookProviderSchema = z.enum(ALL_PROVIDER_KEYS);

export function validateStripeSignature(signature: string | undefined): boolean {
  return !!signature && signature.startsWith("t=");
}

export function validatePaystackSignature(signature: string | undefined): boolean {
  return !!signature && signature.length === 64;
}

export function validateFlutterwaveSignature(
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  return !!signature && !!secret && signature === secret;
}

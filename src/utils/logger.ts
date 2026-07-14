import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";

export function generatePaymentReference(prefix = "PAY"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateEscrowId(): string {
  return `ESC-${uuidv4().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
}

export function generateTransactionId(): string {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateRequestId(): string {
  return uuidv4();
}

export function generateWebhookIdempotencyKey(
  provider: string,
  eventId: string,
): string {
  return `${provider}:${eventId}`;
}

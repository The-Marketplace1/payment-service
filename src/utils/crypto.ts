import crypto from "node:crypto";

export function createHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmacSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashPayload(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function generateIdempotencyKey(data: Record<string, unknown>): string {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return hashPayload(stable);
}

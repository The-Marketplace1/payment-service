import { describe, it, expect } from "vitest";

describe("Webhook validation", () => {
  it("creates deterministic idempotency key for same inputs", async () => {
    const { generateWebhookIdempotencyKey } = await import("../src/utils/id-generator.js");
    const key1 = generateWebhookIdempotencyKey("STRIPE", "evt_001");
    const key2 = generateWebhookIdempotencyKey("STRIPE", "evt_001");
    expect(key1).toEqual(key2);
  });

  it("creates different keys for different events", async () => {
    const { generateWebhookIdempotencyKey } = await import("../src/utils/id-generator.js");
    const key1 = generateWebhookIdempotencyKey("STRIPE", "evt_001");
    const key2 = generateWebhookIdempotencyKey("STRIPE", "evt_002");
    expect(key1).not.toEqual(key2);
  });

  it("verifies HMAC signature correctly", async () => {
    const { createHmacSignature, verifyHmacSignature } = await import("../src/utils/crypto.js");
    const payload = '{"event":"charge.success","data":{}}';
    const secret = "test-secret-key";
    const sig = createHmacSignature(payload, secret);
    expect(verifyHmacSignature(payload, sig, secret)).toBe(true);
    expect(verifyHmacSignature(payload, "invalidsig0".padEnd(64, "0"), secret)).toBe(false);
  });
});

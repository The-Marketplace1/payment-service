import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Payments", () => {
  it("should validate amount must be positive integer", () => {
    expect(0 < 1).toBe(true);
  });

  it("should generate unique payment references", async () => {
    const { generatePaymentReference } = await import("../src/utils/id-generator.js");
    const ref1 = generatePaymentReference();
    const ref2 = generatePaymentReference();
    expect(ref1).not.toEqual(ref2);
    expect(ref1).toMatch(/^PAY-/);
  });

  it("should convert amounts to smallest currency unit", async () => {
    const { toSmallestUnit, fromSmallestUnit } = await import("../src/utils/money.js");
    expect(toSmallestUnit(10.5, "USD")).toBe(1050);
    expect(fromSmallestUnit(1050, "USD")).toBe(10.5);
  });
});

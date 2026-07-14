import { describe, it, expect } from "vitest";

describe("Transaction utils", () => {
  it("generates unique transaction IDs", async () => {
    const { generateTransactionId } = await import("../src/utils/id-generator.js");
    const id1 = generateTransactionId();
    const id2 = generateTransactionId();
    expect(id1).not.toEqual(id2);
    expect(id1).toMatch(/^TXN-/);
  });

  it("formats money amounts correctly", async () => {
    const { formatAmount } = await import("../src/utils/money.js");
    expect(formatAmount(5000, "USD")).toBe("$50.00");
  });

  it("calculates platform fee correctly", async () => {
    const { calculatePlatformFee } = await import("../src/utils/money.js");
    expect(calculatePlatformFee(10000, 2.5)).toBe(250);
  });
});

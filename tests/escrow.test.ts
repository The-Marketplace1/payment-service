import { describe, it, expect } from "vitest";

describe("Escrow State Machine", () => {
  it("allows CREATED → FUNDED transition", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("CREATED", "FUNDED")).toBe(true);
  });

  it("allows FUNDED → HELD transition", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("FUNDED", "HELD")).toBe(true);
  });

  // ─── Release / Payout flow ─────────────────────────────────────────────────

  it("allows HELD → RELEASE_PENDING (triggers payout)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "RELEASE_PENDING")).toBe(true);
  });

  it("allows RELEASE_PENDING → RELEASED (payout confirmed)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("RELEASE_PENDING", "RELEASED")).toBe(true);
  });

  it("allows RELEASE_PENDING → PAYOUT_FAILED", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("RELEASE_PENDING", "PAYOUT_FAILED")).toBe(true);
  });

  it("allows PAYOUT_FAILED → RELEASE_PENDING (retry)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("PAYOUT_FAILED", "RELEASE_PENDING")).toBe(true);
  });

  it("disallows HELD → RELEASED direct (must go via RELEASE_PENDING)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "RELEASED")).toBe(false);
  });

  // ─── Refund flow ───────────────────────────────────────────────────────────

  it("allows HELD → REFUNDED (sync refund)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "REFUNDED")).toBe(true);
  });

  it("allows HELD → REFUND_PENDING (async refund)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "REFUND_PENDING")).toBe(true);
  });

  it("allows REFUND_PENDING → REFUNDED (provider confirms)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("REFUND_PENDING", "REFUNDED")).toBe(true);
  });

  // ─── Dispute flow ──────────────────────────────────────────────────────────

  it("allows HELD → DISPUTED", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "DISPUTED")).toBe(true);
  });

  it("allows DISPUTED → RELEASE_PENDING (resolved for professional)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("DISPUTED", "RELEASE_PENDING")).toBe(true);
  });

  it("allows DISPUTED → REFUNDED (resolved for customer)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("DISPUTED", "REFUNDED")).toBe(true);
  });

  it("allows DISPUTED → RELEASED (partial settlement)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("DISPUTED", "RELEASED")).toBe(true);
  });

  // ─── Protection rules ──────────────────────────────────────────────────────

  it("disallows CREATED → RELEASED (no skipping)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("CREATED", "RELEASED")).toBe(false);
  });

  it("disallows RELEASED → REFUNDED (terminal)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("RELEASED", "REFUNDED")).toBe(false);
  });

  it("disallows DISPUTED → HELD (no going back)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("DISPUTED", "HELD")).toBe(false);
  });

  it("disallows EXPIRED → RELEASED (terminal)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("EXPIRED", "RELEASED")).toBe(false);
  });

  // ─── Special states ────────────────────────────────────────────────────────

  it("allows HELD → CHARGEBACK", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "CHARGEBACK")).toBe(true);
  });

  it("allows RELEASED → CHARGEBACK (post-release provider dispute)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("RELEASED", "CHARGEBACK")).toBe(true);
  });

  it("allows HELD → EXPIRED (auto-expiry)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("HELD", "EXPIRED")).toBe(true);
  });

  it("allows FUNDED → EXPIRED (abandoned escrow)", async () => {
    const { canTransition } = await import("../src/modules/escrow/escrow.state-machine.js");
    expect(canTransition("FUNDED", "EXPIRED")).toBe(true);
  });
});

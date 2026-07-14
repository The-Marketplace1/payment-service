import type { EscrowStatus } from "@prisma/client";
import { ESCROW_TRANSITIONS } from "../../types/escrow.types.js";

export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return ESCROW_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getValidTransitions(from: EscrowStatus): EscrowStatus[] {
  return ESCROW_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export function assertTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid escrow transition: ${from} → ${to}. Valid transitions from ${from}: [${getValidTransitions(from).join(", ")}]`,
    );
  }
}

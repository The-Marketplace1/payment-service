import { prisma } from "../config/database.js";
import { settingsService } from "./settings.service.js";
import { ledgerService } from "./ledger.service.js";
import { refundService } from "./refund.service.js";
import { logger } from "../config/logger.js";

export const expiryService = {
  async expireStaleEscrows(): Promise<{ expired: number; errors: number }> {
    const settings = await settingsService.get();
    const cutoff = new Date(Date.now() - settings.escrowExpiryDays * 86_400_000);

    const stale = await prisma.escrow.findMany({
      where: {
        status: { in: ["FUNDED", "HELD"] },
        createdAt: { lte: cutoff },
      },
      include: { payment: true },
    });

    let expired = 0;
    let errors = 0;

    for (const escrow of stale) {
      try {
        await prisma.escrow.update({
          where: { id: escrow.id },
          data: { status: "EXPIRED", expiredAt: new Date() },
        });

        await ledgerService.record({
          escrowId: escrow.id,
          type: "EXPIRY",
          amount: escrow.amount,
          currency: escrow.currency,
          description: `Escrow auto-expired after ${settings.escrowExpiryDays} days (booking ${escrow.bookingId})`,
          metadata: { cutoff: cutoff.toISOString(), escrowExpiryDays: settings.escrowExpiryDays },
        });

        if (escrow.paymentId && escrow.status === "FUNDED") {
          await refundService.initiateRefund({
            paymentId: escrow.paymentId,
            reason: "Escrow expired — auto-refund",
            requestedBy: "system",
          });
        }

        logger.warn({ escrowId: escrow.id, bookingId: escrow.bookingId, status: escrow.status }, "Escrow expired");
        expired++;
      } catch (err) {
        logger.error({ err, escrowId: escrow.id }, "Failed to expire escrow");
        errors++;
      }
    }

    logger.info({ expired, errors, cutoff }, "Escrow expiry run complete");
    return { expired, errors };
  },
};

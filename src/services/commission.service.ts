import { prisma } from "../config/database.js";
import { settingsService } from "./settings.service.js";
import { logger } from "../config/logger.js";

export interface CommissionBreakdown {
  gross: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
}

export const commissionService = {
  calculate(gross: number, rate: number): CommissionBreakdown {
    const commissionAmount = Math.floor(gross * rate);
    const netAmount = gross - commissionAmount;
    return { gross, commissionRate: rate, commissionAmount, netAmount };
  },

  async calculateFromSettings(gross: number): Promise<CommissionBreakdown> {
    const settings = await settingsService.get();
    return this.calculate(gross, settings.commissionRate);
  },

  async storeOnEscrow(escrowId: string, gross: number, rateOverride?: number): Promise<CommissionBreakdown> {
    const rate = rateOverride ?? (await settingsService.get()).commissionRate;
    const breakdown = this.calculate(gross, rate);

    await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        commissionRate: breakdown.commissionRate,
        commissionAmount: breakdown.commissionAmount,
        netAmount: breakdown.netAmount,
      },
    });

    logger.info({ escrowId, ...breakdown }, "Commission stored on escrow");
    return breakdown;
  },
};

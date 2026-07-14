import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";

export interface FinancialSettingsData {
  commissionRate: number;
  minimumPayout: number;
  minimumRefund: number;
  disputeWindowDays: number;
  escrowExpiryDays: number;
  updatedBy?: string | null;
  updatedAt: Date;
}

let cachedSettings: FinancialSettingsData | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

async function fetchFromDb(): Promise<FinancialSettingsData> {
  let settings = await prisma.financialSettings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.financialSettings.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });
    logger.info("Financial settings initialised with defaults");
  }
  return settings;
}

export const settingsService = {
  async get(): Promise<FinancialSettingsData> {
    if (cachedSettings && Date.now() < cacheExpiresAt) return cachedSettings;
    const settings = await fetchFromDb();
    cachedSettings = settings;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return settings;
  },

  async update(
    patch: Partial<Omit<FinancialSettingsData, "updatedAt">>,
    updatedBy: string,
  ): Promise<FinancialSettingsData> {
    const settings = await prisma.financialSettings.upsert({
      where: { id: "global" },
      create: { id: "global", ...patch, updatedBy },
      update: { ...patch, updatedBy },
    });
    cachedSettings = settings;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    logger.info({ patch, updatedBy }, "Financial settings updated");
    return settings;
  },

  invalidateCache() {
    cachedSettings = null;
    cacheExpiresAt = 0;
  },
};

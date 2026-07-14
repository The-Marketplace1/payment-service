import type { Request, Response } from "express";
import { z } from "zod";
import { settingsService } from "../../services/settings.service.js";
import { reportsService } from "../../services/reports.service.js";
import { fraudService } from "../../services/fraud.service.js";
import { expiryService } from "../../services/expiry.service.js";
import { reconciliationService } from "../../services/reconciliation.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import type { PaymentProvider } from "@prisma/client";

const UpdateSettingsSchema = z.object({
  commissionRate: z.number().min(0).max(1).optional(),
  minimumPayout: z.number().int().positive().optional(),
  minimumRefund: z.number().int().positive().optional(),
  disputeWindowDays: z.number().int().positive().optional(),
  escrowExpiryDays: z.number().int().positive().optional(),
});

function parseDateRange(req: Request): { from: Date; to: Date } {
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const fromDefault = new Date(to);
  fromDefault.setDate(fromDefault.getDate() - 30);
  const from = req.query.from ? new Date(req.query.from as string) : fromDefault;
  return { from, to };
}

export const adminController = {
  async getSettings(_req: Request, res: Response): Promise<void> {
    const settings = await settingsService.get();
    sendSuccess(res, settings);
  },

  async updateSettings(req: Request, res: Response): Promise<void> {
    const parsed = UpdateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }
    const updatedBy = (req.headers["x-user-id"] as string) ?? "admin";
    const settings = await settingsService.update(parsed.data, updatedBy);
    sendSuccess(res, settings);
  },

  async getDashboard(_req: Request, res: Response): Promise<void> {
    const dashboard = await reportsService.getDashboard();
    sendSuccess(res, dashboard);
  },

  async getRevenueReport(req: Request, res: Response): Promise<void> {
    const period = (req.query.period as "daily" | "monthly") ?? "daily";
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const report = await reportsService.getRevenue(period, date);
    sendSuccess(res, report);
  },

  async getCommissionsReport(req: Request, res: Response): Promise<void> {
    const { from, to } = parseDateRange(req);
    const report = await reportsService.getCommissions(from, to);
    sendSuccess(res, report);
  },

  async getPayoutsReport(req: Request, res: Response): Promise<void> {
    const { from, to } = parseDateRange(req);
    const report = await reportsService.getPayouts(from, to);
    sendSuccess(res, report);
  },

  async getRefundsReport(req: Request, res: Response): Promise<void> {
    const { from, to } = parseDateRange(req);
    const report = await reportsService.getRefunds(from, to);
    sendSuccess(res, report);
  },

  async getEscrowReport(_req: Request, res: Response): Promise<void> {
    const report = await reportsService.getEscrowOverview();
    sendSuccess(res, report);
  },

  async exportAudit(req: Request, res: Response): Promise<void> {
    const { from, to } = parseDateRange(req);
    const format = (req.query.format as "json" | "csv") ?? "json";

    const data = await reportsService.exportAuditLedger(from, to, format);

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
      );
      res.status(200).send(data);
      return;
    }

    sendSuccess(res, data);
  },

  async triggerExpiry(_req: Request, res: Response): Promise<void> {
    const result = await expiryService.expireStaleEscrows();
    sendSuccess(res, result);
  },

  async runReconciliation(req: Request, res: Response): Promise<void> {
    const { getAllProviderKeys } = await import("../../services/provider.service.js");
    const allKeys = getAllProviderKeys();
    const provider = (req.query.provider as PaymentProvider) ?? allKeys[0];
    if (!allKeys.includes(provider)) {
      sendError(res, `Invalid provider. Must be one of: ${allKeys.join(", ")}`);
      return;
    }
    const { from, to } = parseDateRange(req);
    const result = await reconciliationService.runForPeriod(provider, from, to);
    sendSuccess(res, result);
  },

  async listReconciliations(req: Request, res: Response): Promise<void> {
    const provider = req.query.provider as PaymentProvider | undefined;
    const runs = await reconciliationService.listRuns(provider);
    sendSuccess(res, runs);
  },

  async listFraudFlags(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string | undefined;
    const resolved = req.query.resolved !== undefined ? req.query.resolved === "true" : undefined;
    const flags = await fraudService.listFlags(userId, resolved);
    sendSuccess(res, flags);
  },

  async resolveFraudFlag(req: Request, res: Response): Promise<void> {
    const { flagId } = req.params;
    await fraudService.resolveFlag(Array.isArray(flagId) ? flagId[0] : flagId);
    sendSuccess(res, { resolved: true });
  },

  async getUserRiskScore(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const score = await fraudService.getUserRiskScore(Array.isArray(userId) ? userId[0] : userId);
    sendSuccess(res, { userId, riskScore: score });
  },

  async getCurrencies(req: Request, res: Response): Promise<void> {
    const { getAllCurrencies, getEnabledCurrencies } = await import("../../config/currencies.config.js");
    const all = (req.query.all === "true");
    sendSuccess(res, all ? getAllCurrencies() : getEnabledCurrencies());
  },

  async getCountries(req: Request, res: Response): Promise<void> {
    const { getAllCountries, getEnabledCountries } = await import("../../config/countries.config.js");
    const all = (req.query.all === "true");
    sendSuccess(res, all ? getAllCountries() : getEnabledCountries());
  },
};

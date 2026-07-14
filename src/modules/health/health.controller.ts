import type { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { CONSTANTS } from "../../config/constants.js";
import { getAvailableProviders } from "../../services/provider.service.js";
import { sendSuccess } from "../../utils/response.js";

export const healthController = {
  async check(_req: Request, res: Response): Promise<void> {
    let dbStatus = "healthy";
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = "unhealthy";
    }

    const health = {
      service: CONSTANTS.SERVICE_NAME,
      status: dbStatus === "healthy" ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      providers: getAvailableProviders(),
    };

    res.status(health.status === "ok" ? 200 : 503).json({ success: true, data: health });
  },

  async ready(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { ready: true });
  },
};

import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { sendForbidden } from "../utils/response.js";
import { logger } from "../config/logger.js";

export function serviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.SERVICE_API_KEY) {
    next();
    return;
  }

  const apiKey =
    (req.headers["x-service-api-key"] as string) ||
    (req.headers["x-api-key"] as string);

  if (!apiKey || apiKey !== env.SERVICE_API_KEY) {
    logger.warn(
      { path: req.path, ip: req.ip },
      "Unauthorized service API call",
    );
    sendForbidden(res, "Invalid service API key");
    return;
  }

  next();
}

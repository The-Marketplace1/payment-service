import type { Request, Response, NextFunction } from "express";
import { sendUnauthorized } from "../utils/response.js";
import { logger } from "../config/logger.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendUnauthorized(res, "Missing or invalid authorization header");
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    sendUnauthorized(res, "Invalid token");
    return;
  }

  try {
    req.userId = req.headers["x-user-id"] as string;
    req.userRole = req.headers["x-user-role"] as string;

    if (!req.userId) {
      sendUnauthorized(res, "User identity not provided");
      return;
    }

    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    sendUnauthorized(res, "Authentication failed");
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.headers["x-user-id"] as string;
  if (userId) req.userId = userId;
  next();
}

import type { Request, Response, NextFunction } from "express";
import { generateRequestId } from "../utils/id-generator.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId =
    (req.headers["x-request-id"] as string) || generateRequestId();
  next();
}

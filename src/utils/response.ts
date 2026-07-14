import type { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
): void {
  const response: ApiResponse = { success: false, error: message };
  res.status(statusCode).json(response);
}

export function sendNotFound(res: Response, resource = "Resource"): void {
  sendError(res, `${resource} not found`, 404);
}

export function sendUnauthorized(res: Response, message = "Unauthorized"): void {
  sendError(res, message, 401);
}

export function sendForbidden(res: Response, message = "Forbidden"): void {
  sendError(res, message, 403);
}

export function sendInternalError(res: Response, message = "Internal server error"): void {
  sendError(res, message, 500);
}

import { z } from "zod";
import { ALL_PROVIDER_KEYS } from "../../providers/provider-registry.js";

export const CreatePaymentSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("NGN"),
  provider: z.enum(ALL_PROVIDER_KEYS),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});

export const GetPaymentParamsSchema = z.object({
  id: z.string().min(1),
});

export const ListPaymentsQuerySchema = z.object({
  userId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const InitiateRefundSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
  requestedBy: z.string().min(1),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type InitiateRefundInput = z.infer<typeof InitiateRefundSchema>;

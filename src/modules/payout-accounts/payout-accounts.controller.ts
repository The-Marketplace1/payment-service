import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { sendSuccess, sendCreated, sendError } from "../../utils/response.js";
import { NotFoundError } from "../../middleware/error.middleware.js";
import { ALL_PROVIDER_KEYS } from "../../providers/provider-registry.js";

const CreatePayoutAccountSchema = z.object({
  professionalId: z.string().min(1),
  provider: z.enum(ALL_PROVIDER_KEYS),
  accountRef: z.string().min(1),
  accountName: z.string().max(200).optional(),
  currency: z.string().length(3).default("NGN"),
  metadata: z.record(z.unknown()).optional(),
});

const UpdatePayoutAccountSchema = CreatePayoutAccountSchema.omit({ professionalId: true }).partial();

export const payoutAccountsController = {
  async create(req: Request, res: Response): Promise<void> {
    const parsed = CreatePayoutAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }

    const existing = await prisma.payoutAccount.findUnique({
      where: { professionalId: parsed.data.professionalId },
    });

    if (existing) {
      const updated = await prisma.payoutAccount.update({
        where: { professionalId: parsed.data.professionalId },
        data: {
          ...parsed.data,
          metadata: (parsed.data.metadata ?? {}) as object,
          isVerified: false,
        },
      });
      sendSuccess(res, updated);
      return;
    }

    const account = await prisma.payoutAccount.create({
      data: {
        ...parsed.data,
        metadata: (parsed.data.metadata ?? {}) as object,
      },
    });
    sendCreated(res, account);
  },

  async getByProfessional(req: Request, res: Response): Promise<void> {
    const professionalId = Array.isArray(req.params.professionalId)
      ? req.params.professionalId[0]
      : req.params.professionalId;

    const account = await prisma.payoutAccount.findUnique({ where: { professionalId } });
    if (!account) throw new NotFoundError("PayoutAccount");
    sendSuccess(res, account);
  },

  async update(req: Request, res: Response): Promise<void> {
    const professionalId = Array.isArray(req.params.professionalId)
      ? req.params.professionalId[0]
      : req.params.professionalId;

    const parsed = UpdatePayoutAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }

    const account = await prisma.payoutAccount.findUnique({ where: { professionalId } });
    if (!account) throw new NotFoundError("PayoutAccount");

    const updated = await prisma.payoutAccount.update({
      where: { professionalId },
      data: {
        ...parsed.data,
        ...(parsed.data.metadata && { metadata: parsed.data.metadata as object }),
        isVerified: false,
      },
    });
    sendSuccess(res, updated);
  },

  async verify(req: Request, res: Response): Promise<void> {
    const professionalId = Array.isArray(req.params.professionalId)
      ? req.params.professionalId[0]
      : req.params.professionalId;

    const account = await prisma.payoutAccount.findUnique({ where: { professionalId } });
    if (!account) throw new NotFoundError("PayoutAccount");

    const updated = await prisma.payoutAccount.update({
      where: { professionalId },
      data: { isVerified: true },
    });
    sendSuccess(res, updated);
  },

  async list(req: Request, res: Response): Promise<void> {
    const { provider, verified } = req.query as Record<string, string>;
    const accounts = await prisma.payoutAccount.findMany({
      where: {
        ...(provider && { provider: provider as import("@prisma/client").PaymentProvider }),
        ...(verified !== undefined && { isVerified: verified === "true" }),
      },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, accounts);
  },
};

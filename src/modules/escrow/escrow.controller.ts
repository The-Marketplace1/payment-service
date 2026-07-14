import type { Request, Response } from "express";
import { escrowService } from "../../services/escrow.service.js";
import { ledgerService } from "../../services/ledger.service.js";
import { escrowRepository } from "./escrow.repository.js";
import { z } from "zod";
import { sendSuccess, sendCreated, sendError } from "../../utils/response.js";

const CreateEscrowSchema = z.object({
  bookingId: z.string().min(1),
  payerId: z.string().min(1),
  payeeId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("NGN"),
  releaseConditions: z
    .object({
      requiresCompletion: z.boolean().optional(),
      autoReleaseAfterDays: z.number().int().positive().optional(),
      requiresApproval: z.boolean().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const FundEscrowSchema = z.object({
  paymentId: z.string().min(1),
});

const ReleaseEscrowSchema = z.object({
  releasedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const RefundEscrowSchema = z.object({
  refundedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const DisputeEscrowSchema = z.object({
  disputedBy: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

const ResolveDisputeSchema = z.object({
  resolvedBy: z.string().min(1),
  outcome: z.enum(["RELEASE", "REFUND", "PARTIAL"]),
  splitRatio: z.number().min(0.01).max(0.99).optional(),
  reason: z.string().max(1000).optional(),
});

export const escrowController = {
  async createEscrow(req: Request, res: Response): Promise<void> {
    const parsed = CreateEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }
    const result = await escrowService.createEscrow(parsed.data);
    sendCreated(res, result);
  },

  async getEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const escrow = await escrowService.getEscrow(id);
    sendSuccess(res, escrow);
  },

  async getEscrowByBooking(req: Request, res: Response): Promise<void> {
    const bookingId = Array.isArray(req.params.bookingId)
      ? req.params.bookingId[0]
      : req.params.bookingId;
    const escrow = await escrowService.getEscrowByBooking(bookingId);
    sendSuccess(res, escrow);
  },

  async listEscrows(req: Request, res: Response): Promise<void> {
    const { payerId, payeeId, status, page, limit } = req.query as Record<string, string>;
    const result = await escrowService.listEscrows(
      { payerId, payeeId, status },
      Number(page) || 1,
      Number(limit) || 20,
    );
    sendSuccess(res, result.escrows, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  },

  async fundEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = FundEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, "paymentId is required");
      return;
    }
    const result = await escrowService.fundEscrow({ escrowId: id, paymentId: parsed.data.paymentId });
    sendSuccess(res, result);
  },

  async releaseEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = ReleaseEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, "releasedBy is required");
      return;
    }
    const result = await escrowService.releaseEscrow({ escrowId: id, ...parsed.data });
    sendSuccess(res, result);
  },

  async refundEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = RefundEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, "refundedBy is required");
      return;
    }
    const result = await escrowService.refundEscrow({ escrowId: id, ...parsed.data });
    sendSuccess(res, result);
  },

  async disputeEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = DisputeEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }
    const result = await escrowService.disputeEscrow({ escrowId: id, ...parsed.data });
    sendSuccess(res, result);
  },

  async resolveDispute(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = ResolveDisputeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }
    const result = await escrowService.resolveDispute({ escrowId: id, ...parsed.data });
    sendSuccess(res, result);
  },

  async getLedger(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const entries = await ledgerService.getEntriesForEscrow(id);
    const summary = await ledgerService.getSummary(id);
    sendSuccess(res, { summary, entries });
  },

  async chargebackEscrow(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = z
      .object({
        chargebackId: z.string().min(1),
        initiatedBy: z.string().min(1),
        reason: z.string().max(500).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, JSON.stringify(parsed.error.flatten().fieldErrors));
      return;
    }
    const result = await escrowService.chargebackEscrow({ escrowId: id, ...parsed.data });
    sendSuccess(res, result);
  },

  async retryPayout(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = z
      .object({ retriedBy: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, "retriedBy is required");
      return;
    }
    const result = await escrowService.retryPayout({ escrowId: id, retriedBy: parsed.data.retriedBy });
    sendSuccess(res, result);
  },

  async getEscrowStats(_req: Request, res: Response): Promise<void> {
    const stats = await escrowRepository.countByStatus();
    sendSuccess(res, stats);
  },
};

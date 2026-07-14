import type { Request, Response } from "express";
import { paymentService } from "../../services/payment.service.js";
import { refundService } from "../../services/refund.service.js";
import { transactionService } from "../../services/transaction.service.js";
import {
  CreatePaymentSchema,
  ListPaymentsQuerySchema,
  InitiateRefundSchema,
} from "./payments.validator.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../utils/response.js";

export const paymentsController = {
  async initiatePayment(req: Request, res: Response): Promise<void> {
    const parsed = CreatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.flatten().fieldErrors.toString());
      return;
    }
    const result = await paymentService.initiatePayment(parsed.data);
    sendCreated(res, result);
  },

  async getPayment(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payment = await paymentService.getPayment(id);
    sendSuccess(res, payment);
  },

  async getPaymentByReference(req: Request, res: Response): Promise<void> {
    const ref = Array.isArray(req.params.reference)
      ? req.params.reference[0]
      : req.params.reference;
    const payment = await paymentService.getPaymentByReference(ref);
    sendSuccess(res, payment);
  },

  async listPayments(req: Request, res: Response): Promise<void> {
    const parsed = ListPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, "Invalid query parameters");
      return;
    }
    const result = await paymentService.listPayments(
      parsed.data.userId,
      parsed.data.page,
      parsed.data.limit,
    );
    sendSuccess(res, result.payments, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  },

  async initiateRefund(req: Request, res: Response): Promise<void> {
    const paymentId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const parsed = InitiateRefundSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.flatten().fieldErrors.toString());
      return;
    }
    const result = await refundService.initiateRefund({
      paymentId,
      ...parsed.data,
    });
    sendSuccess(res, result);
  },

  async getTransactions(req: Request, res: Response): Promise<void> {
    const paymentId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const txs = await transactionService.findByPayment(paymentId);
    sendSuccess(res, txs);
  },
};

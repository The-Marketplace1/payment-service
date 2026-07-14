import type { Request, Response } from "express";
import { transactionRepository } from "./transactions.repository.js";
import { sendSuccess, sendNotFound } from "../../utils/response.js";
import type { TransactionType, TransactionStatus } from "@prisma/client";

export const transactionsController = {
  async listTransactions(req: Request, res: Response): Promise<void> {
    const { type, status, page, limit } = req.query as Record<string, string>;
    const [transactions, total] = await Promise.all([
      transactionRepository.findAll(
        {
          type: type as TransactionType | undefined,
          status: status as TransactionStatus | undefined,
        },
        Number(page) || 1,
        Number(limit) || 20,
      ),
      transactionRepository.countAll({
        type: type as TransactionType | undefined,
        status: status as TransactionStatus | undefined,
      }),
    ]);
    sendSuccess(res, transactions, 200, { total, page: Number(page) || 1, limit: Number(limit) || 20 });
  },

  async getTransaction(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tx = await transactionRepository.findById(id);
    if (!tx) {
      sendNotFound(res, "Transaction");
      return;
    }
    sendSuccess(res, tx);
  },

  async getTransactionStats(_req: Request, res: Response): Promise<void> {
    const stats = await transactionRepository.sumByType();
    sendSuccess(res, stats);
  },
};

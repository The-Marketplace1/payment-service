import { Router } from "express";
import { transactionsController } from "./transactions.controller.js";
import { serviceAuthMiddleware } from "../../middleware/service-auth.middleware.js";

const router = Router();

router.get("/", serviceAuthMiddleware, async (req, res) => {
  await transactionsController.listTransactions(req, res);
});

router.get("/stats", serviceAuthMiddleware, async (req, res) => {
  await transactionsController.getTransactionStats(req, res);
});

router.get("/:id", serviceAuthMiddleware, async (req, res) => {
  await transactionsController.getTransaction(req, res);
});

export default router;

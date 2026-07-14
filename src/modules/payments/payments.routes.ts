import { Router } from "express";
import { paymentsController } from "./payments.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {
  await paymentsController.initiatePayment(req, res);
});

router.get("/", authMiddleware, async (req, res) => {
  await paymentsController.listPayments(req, res);
});

router.get("/:id", authMiddleware, async (req, res) => {
  await paymentsController.getPayment(req, res);
});

router.get("/reference/:reference", authMiddleware, async (req, res) => {
  await paymentsController.getPaymentByReference(req, res);
});

router.post("/:id/refund", authMiddleware, async (req, res) => {
  await paymentsController.initiateRefund(req, res);
});

router.get("/:id/transactions", authMiddleware, async (req, res) => {
  await paymentsController.getTransactions(req, res);
});

export default router;

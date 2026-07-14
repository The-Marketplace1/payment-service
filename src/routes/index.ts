import { Router } from "express";
import { CONSTANTS } from "../config/constants.js";
import paymentsRouter from "../modules/payments/payments.routes.js";
import transactionsRouter from "../modules/transactions/transactions.routes.js";
import adminRouter from "../modules/admin/admin.routes.js";
import payoutAccountsRouter from "../modules/payout-accounts/payout-accounts.routes.js";
import { escrowController } from "../modules/escrow/escrow.controller.js";
import { webhookController } from "../modules/webhooks/payment.webhook.controller.js";
import { healthController } from "../modules/health/health.controller.js";
import { serviceAuthMiddleware } from "../middleware/service-auth.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/healthz", async (req, res) => {
  await healthController.check(req, res);
});
router.get("/readyz", async (req, res) => {
  await healthController.ready(req, res);
});

const v1 = Router();

v1.use("/payments", paymentsRouter);
v1.use("/transactions", transactionsRouter);
v1.use("/payout-accounts", serviceAuthMiddleware, payoutAccountsRouter);

// ─── Escrow ───────────────────────────────────────────────────────────────────
v1.post("/escrow", authMiddleware, async (req, res) => {
  await escrowController.createEscrow(req, res);
});
v1.get("/escrow", serviceAuthMiddleware, async (req, res) => {
  await escrowController.listEscrows(req, res);
});
v1.get("/escrow/stats", serviceAuthMiddleware, async (req, res) => {
  await escrowController.getEscrowStats(req, res);
});
v1.get("/escrow/booking/:bookingId", authMiddleware, async (req, res) => {
  await escrowController.getEscrowByBooking(req, res);
});
v1.get("/escrow/:id", authMiddleware, async (req, res) => {
  await escrowController.getEscrow(req, res);
});
v1.get("/escrow/:id/ledger", serviceAuthMiddleware, async (req, res) => {
  await escrowController.getLedger(req, res);
});
v1.post("/escrow/:id/fund", serviceAuthMiddleware, async (req, res) => {
  await escrowController.fundEscrow(req, res);
});
v1.post("/escrow/:id/release", serviceAuthMiddleware, async (req, res) => {
  await escrowController.releaseEscrow(req, res);
});
v1.post("/escrow/:id/refund", serviceAuthMiddleware, async (req, res) => {
  await escrowController.refundEscrow(req, res);
});
v1.post("/escrow/:id/dispute", authMiddleware, async (req, res) => {
  await escrowController.disputeEscrow(req, res);
});
v1.post("/escrow/:id/resolve", serviceAuthMiddleware, async (req, res) => {
  await escrowController.resolveDispute(req, res);
});
v1.post("/escrow/:id/chargeback", serviceAuthMiddleware, async (req, res) => {
  await escrowController.chargebackEscrow(req, res);
});
v1.post("/escrow/:id/retry-payout", serviceAuthMiddleware, async (req, res) => {
  await escrowController.retryPayout(req, res);
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────
v1.post("/webhooks/stripe", async (req, res) => {
  await webhookController.handleStripe(req, res);
});
v1.post("/webhooks/paystack", async (req, res) => {
  await webhookController.handlePaystack(req, res);
});
v1.post("/webhooks/flutterwave", async (req, res) => {
  await webhookController.handleFlutterwave(req, res);
});

router.use(`/${CONSTANTS.API_VERSION}`, v1);

// ─── Admin (service auth only) ────────────────────────────────────────────────
router.use("/admin", serviceAuthMiddleware, adminRouter);

export default router;

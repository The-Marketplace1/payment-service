import { Router } from "express";
import { adminController } from "./admin.controller.js";

const router = Router();

router.get("/settings", async (req, res) => {
  await adminController.getSettings(req, res);
});
router.put("/settings", async (req, res) => {
  await adminController.updateSettings(req, res);
});

router.get("/dashboard", async (req, res) => {
  await adminController.getDashboard(req, res);
});

router.get("/reports/revenue", async (req, res) => {
  await adminController.getRevenueReport(req, res);
});
router.get("/reports/commissions", async (req, res) => {
  await adminController.getCommissionsReport(req, res);
});
router.get("/reports/payouts", async (req, res) => {
  await adminController.getPayoutsReport(req, res);
});
router.get("/reports/refunds", async (req, res) => {
  await adminController.getRefundsReport(req, res);
});
router.get("/reports/escrow", async (req, res) => {
  await adminController.getEscrowReport(req, res);
});

router.get("/audit/export", async (req, res) => {
  await adminController.exportAudit(req, res);
});

router.post("/ops/expire-escrows", async (req, res) => {
  await adminController.triggerExpiry(req, res);
});

router.post("/ops/reconcile", async (req, res) => {
  await adminController.runReconciliation(req, res);
});
router.get("/ops/reconciliations", async (req, res) => {
  await adminController.listReconciliations(req, res);
});

router.get("/fraud/flags", async (req, res) => {
  await adminController.listFraudFlags(req, res);
});
router.post("/fraud/flags/:flagId/resolve", async (req, res) => {
  await adminController.resolveFraudFlag(req, res);
});
router.get("/fraud/risk/:userId", async (req, res) => {
  await adminController.getUserRiskScore(req, res);
});

router.get("/currencies", async (req, res) => {
  await adminController.getCurrencies(req, res);
});

router.get("/countries", async (req, res) => {
  await adminController.getCountries(req, res);
});

export default router;

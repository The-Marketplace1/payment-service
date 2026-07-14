import { Router } from "express";
import { payoutAccountsController } from "./payout-accounts.controller.js";

const router = Router();

router.post("/", async (req, res) => {
  await payoutAccountsController.create(req, res);
});

router.get("/", async (req, res) => {
  await payoutAccountsController.list(req, res);
});

router.get("/:professionalId", async (req, res) => {
  await payoutAccountsController.getByProfessional(req, res);
});

router.put("/:professionalId", async (req, res) => {
  await payoutAccountsController.update(req, res);
});

router.post("/:professionalId/verify", async (req, res) => {
  await payoutAccountsController.verify(req, res);
});

export default router;

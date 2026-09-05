import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  testPaymentFailureController,
  testPaymentSuccessController,
} from "./payment.controller.js";

const router = Router();

// Development-only payment completion endpoints. No real provider is connected.
router.post("/:id/test-success", requireAuth, testPaymentSuccessController);
router.post("/:id/test-fail", requireAuth, testPaymentFailureController);

export default router;

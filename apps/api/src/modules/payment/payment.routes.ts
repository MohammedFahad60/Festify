import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireDevEnvironment } from "../../middleware/dev-only.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
  testPaymentFailureController,
  testPaymentSuccessController,
} from "./payment.controller.js";

const router = Router();

// Development-only payment completion endpoints. No real provider is connected.
// Blocked in production via requireDevEnvironment; rate-limited to prevent abuse.
router.post("/:id/test-success", requireAuth, requireDevEnvironment, rateLimit({ windowMs: 60_000, max: 20 }), testPaymentSuccessController);
router.post("/:id/test-fail", requireAuth, requireDevEnvironment, rateLimit({ windowMs: 60_000, max: 20 }), testPaymentFailureController);

export default router;

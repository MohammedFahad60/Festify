import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
  cancelOrderController,
  confirmOrderController,
  createOrderController,
  getOrderController,
  listOrdersController,
} from "./order.controller.js";
import {
  createPaymentController,
  getOrderPaymentController,
} from "../payment/payment.controller.js";

const router = Router();

router.post("/", requireAuth, rateLimit({ windowMs: 60_000, max: 20 }), createOrderController);
router.get("/", requireAuth, listOrdersController);
router.post("/:id/payment", requireAuth, rateLimit({ windowMs: 60_000, max: 20 }), createPaymentController);
router.get("/:id/payment", requireAuth, getOrderPaymentController);
router.get("/:id", requireAuth, getOrderController);
router.post("/:id/confirm", requireAuth, confirmOrderController);
router.patch("/:id/cancel", requireAuth, cancelOrderController);

export default router;

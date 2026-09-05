import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
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

router.post("/", requireAuth, createOrderController);
router.get("/", requireAuth, listOrdersController);
router.post("/:id/payment", requireAuth, createPaymentController);
router.get("/:id/payment", requireAuth, getOrderPaymentController);
router.get("/:id", requireAuth, getOrderController);
router.post("/:id/confirm", requireAuth, confirmOrderController);
router.patch("/:id/cancel", requireAuth, cancelOrderController);

export default router;

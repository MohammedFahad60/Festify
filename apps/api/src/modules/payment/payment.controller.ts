import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  createPayment,
  getOrderPayment,
  markPaymentFailed,
  markPaymentSuccess,
} from "./payment.services.js";

const idSchema = z.string().uuid();

function getValidatedId(value: string | undefined) {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
}

function handlePaymentError(error: unknown, res: Response, operation: string) {
  if (error instanceof Error) {
    const responses: Record<string, { status: number; message: string }> = {
      ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
      ORDER_NOT_OWNED: { status: 403, message: "You do not own this order" },
      ORDER_NOT_PENDING: { status: 409, message: "Only pending orders can be paid" },
      ORDER_HAS_NO_ITEMS: { status: 409, message: "Order has no items" },
      PAYMENT_NOT_FOUND: { status: 404, message: "Payment not found" },
      PAYMENT_NOT_OWNED: { status: 403, message: "You do not own this payment" },
      PAYMENT_NOT_PENDING: { status: 409, message: "Payment has already been completed" },
    };
    const response = responses[error.message];
    if (response) {
      return res.status(response.status).json({
        success: false,
        message: response.message,
      });
    }
  }

  console.error(`${operation} error:`, error);
  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
}

export async function createPaymentController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orderId = getValidatedId(String(req.params.id));
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const payment = await createPayment(req.user.id, orderId);
    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: { payment },
    });
  } catch (error) {
    return handlePaymentError(error, res, "Create payment");
  }
}

export async function getOrderPaymentController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orderId = getValidatedId(String(req.params.id));
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const payment = await getOrderPayment(req.user.id, orderId);
    return res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    return handlePaymentError(error, res, "Get order payment");
  }
}

export async function testPaymentSuccessController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const paymentId = getValidatedId(String(req.params.id));
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await markPaymentSuccess(req.user.id, paymentId);
    return res.json({
      success: true,
      message: "Development test payment succeeded",
      data: { payment },
    });
  } catch (error) {
    return handlePaymentError(error, res, "Test payment success");
  }
}

export async function testPaymentFailureController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const paymentId = getValidatedId(String(req.params.id));
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await markPaymentFailed(req.user.id, paymentId);
    return res.json({
      success: true,
      message: "Development test payment failed",
      data: { payment },
    });
  } catch (error) {
    return handlePaymentError(error, res, "Test payment failure");
  }
}

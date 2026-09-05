import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  getUserOrder,
  getUserOrders,
} from "./order.services.js";

const createOrderSchema = z.object({
  festivalId: z.string().uuid(),
  items: z.array(
    z.object({
      ticketTypeId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});

const idSchema = z.string().uuid();

function getValidatedId(value: string | undefined) {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
}

function handleOrderError(error: unknown, res: Response, operation: string) {
  if (error instanceof Error) {
    const responses: Record<string, { status: number; message: string }> = {
      FESTIVAL_NOT_FOUND: { status: 404, message: "Festival not found" },
      FESTIVAL_NOT_PUBLISHED: { status: 409, message: "Festival is not published" },
      FESTIVAL_ENDED: { status: 409, message: "Festival has already ended" },
      TICKET_TYPE_NOT_FOUND: { status: 404, message: "Ticket type not found" },
      TICKET_TYPE_NOT_IN_FESTIVAL: { status: 400, message: "Ticket type does not belong to this festival" },
      TICKET_TYPE_NOT_ACTIVE: { status: 409, message: "Ticket type is not active" },
      TICKET_SALE_NOT_ACTIVE: { status: 409, message: "Ticket sales are not currently active" },
      MAX_PER_USER_EXCEEDED: { status: 409, message: "Maximum tickets per user exceeded" },
      INSUFFICIENT_INVENTORY: { status: 409, message: "Not enough tickets available" },
      ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
      ORDER_NOT_OWNED: { status: 403, message: "You do not own this order" },
      ORDER_NOT_PENDING: { status: 409, message: "Only pending orders can be confirmed" },
      PAYMENT_REQUIRED: { status: 409, message: "A successful payment is required to confirm this order" },
      ORDER_NOT_CANCELLABLE: { status: 409, message: "Order cannot be cancelled" },
      ORDER_HAS_SUCCESSFUL_PAYMENT: { status: 409, message: "Order with a successful payment cannot be cancelled before refunds are implemented" },
      INVENTORY_RESTORE_FAILED: { status: 409, message: "Unable to restore ticket inventory" },
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

export async function createOrderController(
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

    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const order = await createOrder(req.user.id, result.data);
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: { order },
    });
  } catch (error) {
    return handleOrderError(error, res, "Create order");
  }
}

export async function confirmOrderController(
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

    const order = await confirmOrder(req.user.id, orderId);
    return res.json({
      success: true,
      message: "Order confirmed successfully",
      data: { order },
    });
  } catch (error) {
    return handleOrderError(error, res, "Confirm order");
  }
}

export async function listOrdersController(
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

    const orders = await getUserOrders(req.user.id);
    return res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    return handleOrderError(error, res, "List orders");
  }
}

export async function getOrderController(
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

    const order = await getUserOrder(req.user.id, orderId);
    return res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    return handleOrderError(error, res, "Get order");
  }
}

export async function cancelOrderController(
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

    const order = await cancelOrder(req.user.id, orderId);
    return res.json({
      success: true,
      message: "Order cancelled. Refund processing is not implemented yet.",
      data: { order },
    });
  } catch (error) {
    return handleOrderError(error, res, "Cancel order");
  }
}


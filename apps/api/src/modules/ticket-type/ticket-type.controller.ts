import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { createTicketType } from "./ticket-type.services.js";

const createTicketTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  price: z
    .number()
    .nonnegative(),

  quantity: z
    .number()
    .int()
    .positive(),

  saleStart: z
    .string()
    .datetime(),

  saleEnd: z
    .string()
    .datetime(),

  maxPerUser: z
    .number()
    .int()
    .positive()
    .optional(),
});

export async function createTicketTypeController(
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

    const festivalId = String(req.params.festivalId);
    const festivalIdCheck = z.string().uuid().safeParse(festivalId);
    if (!festivalIdCheck.success) {
      return res.status(400).json({ success: false, message: "Invalid festival ID" });
    }

    const result = createTicketTypeSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const ticketType = await createTicketType(
      req.user.id,
      festivalId,
      result.data
    );

    return res.status(201).json({
      success: true,
      message: "Ticket type created successfully",
      data: {
        ticketType,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORGANIZER_NOT_FOUND") {
        return res.status(403).json({
          success: false,
          message: "Organizer profile not found",
        });
      }

      if (error.message === "ORGANIZER_NOT_APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Organizer has not been approved",
        });
      }

      if (error.message === "FESTIVAL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Festival not found",
        });
      }

      if (error.message === "FESTIVAL_NOT_OWNED") {
        return res.status(403).json({
          success: false,
          message: "You do not own this festival",
        });
      }

      if (error.message === "INVALID_SALE_PERIOD") {
        return res.status(400).json({
          success: false,
          message: "Sale end must be after sale start",
        });
      }
    }

    console.error("Create ticket type error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}
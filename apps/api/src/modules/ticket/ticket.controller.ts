import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  checkInTicket,
  getUserTicket,
  getUserTickets,
  validateTicket,
} from "./ticket.services.js";

const idSchema = z.string().uuid();
const ticketCodeSchema = z.string().trim().min(1).max(100);

function ticketError(error: unknown, res: Response, operation: string) {
  if (error instanceof Error) {
    const responses: Record<string, { status: number; message: string }> = {
      ORGANIZER_NOT_FOUND: { status: 403, message: "Organizer profile required" },
      TICKET_NOT_FOUND: { status: 404, message: "Ticket not found" },
      TICKET_NOT_OWNED_BY_ORGANIZER: { status: 403, message: "You cannot access this festival ticket" },
      TICKET_CANCELLED: { status: 409, message: "Ticket has been cancelled" },
      TICKET_USED: { status: 409, message: "Ticket has already been used" },
      ORDER_NOT_CONFIRMED: { status: 409, message: "Order is not confirmed" },
      PAYMENT_NOT_SUCCESSFUL: { status: 409, message: "Payment was not successful" },
      TICKET_ALREADY_USED: { status: 409, message: "Ticket has already been used" },
    };
    const response = responses[error.message];
    if (response) {
      return res.status(response.status).json({ success: false, message: response.message });
    }
  }

  console.error(`${operation} error:`, error);
  return res.status(500).json({ success: false, message: "Something went wrong" });
}

function getTicketCode(value: unknown) {
  const result = ticketCodeSchema.safeParse(value);
  return result.success ? result.data : null;
}

export async function listTicketsController(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const tickets = await getUserTickets(req.user.id);
    return res.json({ success: true, data: { tickets } });
  } catch (error) {
    console.error("List tickets error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}

export async function getTicketController(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const result = idSchema.safeParse(req.params.id);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "Invalid ticket ID" });
  }

  try {
    const ticket = await getUserTicket(req.user.id, result.data);
    return res.json({ success: true, data: { ticket } });
  } catch (error) {
    if (error instanceof Error && error.message === "TICKET_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    if (error instanceof Error && error.message === "TICKET_NOT_OWNED") {
      return res.status(403).json({ success: false, message: "You do not own this ticket" });
    }
    console.error("Get ticket error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}

export async function validateTicketController(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const ticketCode = getTicketCode(req.body?.ticketCode);
  if (!ticketCode) {
    return res.status(400).json({ success: false, message: "Invalid ticket code" });
  }

  try {
    const result = await validateTicket(req.user.id, ticketCode);
    return res.json({ success: true, data: result });
  } catch (error) {
    return ticketError(error, res, "Validate ticket");
  }
}

export async function checkInTicketController(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const ticketCode = getTicketCode(req.params.ticketCode);
  if (!ticketCode) {
    return res.status(400).json({ success: false, message: "Invalid ticket code" });
  }

  try {
    const ticket = await checkInTicket(req.user.id, ticketCode);
    return res.json({
      success: true,
      message: "Ticket checked in successfully",
      data: { ticket },
    });
  } catch (error) {
    return ticketError(error, res, "Check in ticket");
  }
}
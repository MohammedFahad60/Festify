import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
	checkInTicketController,
	getTicketController,
	listTicketsController,
	validateTicketController,
} from "./ticket.controller.js";

const router = Router();

router.get("/", requireAuth, listTicketsController);
router.get("/:id", requireAuth, getTicketController);
router.post("/validate", requireAuth, requireRole("ORGANIZER"), rateLimit({ windowMs: 60_000, max: 60 }), validateTicketController);
router.post("/:ticketCode/check-in", requireAuth, requireRole("ORGANIZER"), rateLimit({ windowMs: 60_000, max: 60 }), checkInTicketController);

export default router;

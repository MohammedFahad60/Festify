import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import {
	checkInTicketController,
	getTicketController,
	listTicketsController,
	validateTicketController,
} from "./ticket.controller.js";

const router = Router();

router.get("/", requireAuth, listTicketsController);
router.get("/:id", requireAuth, getTicketController);
router.post("/validate", requireAuth, requireRole("ORGANIZER"), validateTicketController);
router.post("/:ticketCode/check-in", requireAuth, requireRole("ORGANIZER"), checkInTicketController);

export default router;
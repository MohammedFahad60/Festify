import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { createTicketTypeController } from "./ticket-type.controller.js";

const router = Router();

router.post(
  "/festivals/:festivalId/ticket-types",
  requireAuth,
  requireRole("ORGANIZER"),
  createTicketTypeController
);

export default router;
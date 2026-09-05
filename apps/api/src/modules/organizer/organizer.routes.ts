import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

import {
  createOrganizer,
  getMyOrganizerProfile,
  approveOrganizer,
} from "./organizer.controller.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  createOrganizer
);

router.get(
  "/me",
  requireAuth,
  getMyOrganizerProfile
);

router.patch(
  "/:id/approve",
  requireAuth,
  requireRole("ADMIN"),
  approveOrganizer
);

export default router;
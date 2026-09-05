import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

import {
  approveFestivalController,
  approveOrganizerController,
  pendingFestivals,
  pendingOrganizers,
  rejectFestivalController,
  rejectOrganizerController,
} from "./admin.controller.js";

const router = Router();

router.get(
  "/organizers/pending",
  requireAuth,
  requireRole("ADMIN"),
  pendingOrganizers
);

router.patch(
  "/organizers/:id/approve",
  requireAuth,
  requireRole("ADMIN"),
  approveOrganizerController
);

router.patch(
  "/organizers/:id/reject",
  requireAuth,
  requireRole("ADMIN"),
  rejectOrganizerController
);

router.get(
  "/festivals/submitted",
  requireAuth,
  requireRole("ADMIN"),
  pendingFestivals
);

router.patch(
  "/festivals/:id/approve",
  requireAuth,
  requireRole("ADMIN"),
  approveFestivalController
);

router.patch(
  "/festivals/:id/reject",
  requireAuth,
  requireRole("ADMIN"),
  rejectFestivalController
);

export default router;
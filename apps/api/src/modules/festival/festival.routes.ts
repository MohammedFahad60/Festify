import { Router } from "express";

import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

import {
  createFestivalController,
  getPublishedFestivalController,
  listPublishedFestivalsController,
  getOrganizerFestivalController,
  listOrganizerFestivalsController,
  publishFestivalController,
  submitFestivalController,
  updateFestivalController,

  addFestivalImageController,
  listFestivalImagesController,
  updateFestivalImageController,
  deleteFestivalImageController,

} from "./festival.controller.js";

const router = Router();

router.get("/organizer", requireAuth, requireRole("ORGANIZER"), listOrganizerFestivalsController);
router.get("/organizer/:id", requireAuth, requireRole("ORGANIZER"), getOrganizerFestivalController);

router.get("/", listPublishedFestivalsController);

router.get("/:id", getPublishedFestivalController);

router.post(
  "/",
  requireAuth,
  requireRole("ORGANIZER"),
  createFestivalController
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ORGANIZER"),
  updateFestivalController
);

router.patch(
  "/:id/submit",
  requireAuth,
  requireRole("ORGANIZER"),
  submitFestivalController
);

router.patch(
  "/:id/publish",
  requireAuth,
  requireRole("ORGANIZER"),
  publishFestivalController
);


router.get("/:id/images", optionalAuth, listFestivalImagesController);
router.post("/:id/images", requireAuth, requireRole("ORGANIZER"), addFestivalImageController);
router.patch("/:festivalId/images/:imageId", requireAuth, requireRole("ORGANIZER"), updateFestivalImageController);
router.delete("/:festivalId/images/:imageId", requireAuth, requireRole("ORGANIZER"), deleteFestivalImageController);

export default router;
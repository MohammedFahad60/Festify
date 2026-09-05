import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();

router.get(
  "/attendee",
  requireAuth,
  requireRole("ATTENDEE"),
  (_req, res) => {
    res.json({
      success: true,
      message: "You have attendee access",
    });
  }
);

router.get(
  "/organizer",
  requireAuth,
  requireRole("ORGANIZER"),
  (_req, res) => {
    res.json({
      success: true,
      message: "You have organizer access",
    });
  }
);

router.get(
  "/admin",
  requireAuth,
  requireRole("ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "You have admin access",
    });
  }
);

export default router;
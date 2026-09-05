import { Router } from "express";
import {
  login,
  logout,
  me,
  register,
} from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";

const router = Router();

router.post("/register", rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.ip || "global" }), register);
router.post("/login", rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.ip || "global" }), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
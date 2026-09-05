import type { Request, Response, NextFunction } from "express";

/**
 * Block development-only endpoints in production.
 * Payment test endpoints use a mock provider and must not run in production.
 */
export function requireDevEnvironment(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
}

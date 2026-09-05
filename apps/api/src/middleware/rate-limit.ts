import type { Request, Response, NextFunction } from "express";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/**
 * Lightweight in-memory rate limiter.
 * Not distributed — suitable for single-instance MVP without extra infra.
 * Documented as known limitation for horizontally scaled deployments.
 */
export function rateLimit(opts: { windowMs: number; max: number; keyGenerator?: (req: Request) => string }) {
  const windowMs = opts.windowMs;
  const max = opts.max;
  const keyGen = opts.keyGenerator || ((req: Request) => (req as any).user?.id || req.ip || "global");

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${keyGen(req)}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, message: "Too many requests, please try again shortly." });
    }
    entry.count += 1;
    next();
  };
}

// Periodic cleanup to avoid unbounded memory (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) if (now > v.resetAt) store.delete(k);
}, 5 * 60 * 1000).unref();

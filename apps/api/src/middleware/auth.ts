import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
const db = prisma as any;
import { ACCESS_COOKIE } from "../lib/auth.js";
export interface AuthenticatedRequest extends Request { user?: { id: string; role: string; roles: string[]; sessionId: string }; }
function unauthenticated(res: Response) { return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }); }
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) { try {
  const token = req.cookies?.[ACCESS_COOKIE]; if (!token) return unauthenticated(res);
  const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as { sub?: string; sid?: string; role?: string };
  if (!payload.sub || !payload.sid) return unauthenticated(res);
  const rows = await db.$queryRaw<Array<{ user_id: string; revoked_at: Date | null; expires_at: Date }>>`SELECT "user_id", "revoked_at", "expires_at" FROM "session" WHERE "id"=${payload.sid} LIMIT 1`;
  const session = rows[0]; if (!session || session.revoked_at || new Date(session.expires_at) <= new Date() || session.user_id !== payload.sub) return unauthenticated(res);
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: { include: { role: true } } } });
  if (!user || user.status !== "ACTIVE") return unauthenticated(res);
  const roles = user.roles.map((r: any) => r.role.name === "ATTENDEE" ? "USER" : r.role.name);
  req.user = { id: user.id, role: roles.includes("ADMIN") ? "ADMIN" : roles.includes("ORGANIZER") ? "ORGANIZER" : "USER", roles, sessionId: payload.sid }; return next();
} catch { return unauthenticated(res); } }
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next();
  try { const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as { sub?: string; sid?: string }; if (!payload.sub || !payload.sid) return next(); const rows = await db.$queryRaw<Array<{ user_id: string; revoked_at: Date | null; expires_at: Date }>>`SELECT "user_id", "revoked_at", "expires_at" FROM "session" WHERE "id"=${payload.sid} LIMIT 1`; const s = rows[0]; if (!s || s.revoked_at || new Date(s.expires_at) <= new Date()) return next(); const u = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: { include: { role: true } } } }); if (u && u.status === "ACTIVE") { const roles = u.roles.map((r: any) => r.role.name === "ATTENDEE" ? "USER" : r.role.name); req.user = { id: u.id, roles, role: roles.includes("ADMIN") ? "ADMIN" : roles.includes("ORGANIZER") ? "ORGANIZER" : "USER", sessionId: payload.sid }; } } catch { /* anonymous */ } return next();
}

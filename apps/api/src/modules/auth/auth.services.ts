import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
const db = prisma as any;
import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { createAccessToken, hashToken, randomToken, ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from "../../lib/auth.js";

export class AuthError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }
const safeUser = (user: any, roles: string[] = []) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, profileImage: user.profileImage ?? null, status: user.status, roles });
const audit = async (actorId: string | null, action: string, entity = "AUTH", entityId: string | null = null, metadata: unknown = undefined) => {
  await db.$executeRaw`INSERT INTO "audit_log" ("id", "actor_id", "action", "entity", "entity_id", "metadata", "created_at") VALUES (${crypto.randomUUID()}, ${actorId}, ${action}, ${entity}, ${entityId}, ${metadata ? JSON.stringify(metadata) : null}::jsonb, CURRENT_TIMESTAMP)`;
};
async function issueSession(userId: string, role: string, ip?: string, userAgent?: string, familyId = crypto.randomUUID()) {
  const sessionId = crypto.randomUUID(); const refresh = randomToken();
  await db.$executeRaw`INSERT INTO "session" ("id", "user_id", "refresh_token_hash", "expires_at", "family_id", "ip_address", "user_agent", "created_at") VALUES (${sessionId}, ${userId}, ${hashToken(refresh)}, CURRENT_TIMESTAMP + INTERVAL '30 days', ${familyId}, ${ip ?? null}, ${userAgent ?? null}, CURRENT_TIMESTAMP)`;
  return { sessionId, refresh, access: createAccessToken(userId, role, sessionId) };
}
async function rolesFor(userId: string): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT r."name" FROM "role" r JOIN "user_role" ur ON ur."role_id"=r."id" WHERE ur."user_id"=${userId}`;
  return rows.map((r: { name: string }) => r.name === "ATTENDEE" ? "USER" : r.name);
}
export async function registerUser(input: { name: string; email: string; password: string }, req?: { ip?: string; headers?: Record<string, unknown> }) {
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new AuthError("EMAIL_EXISTS", "An account with this email already exists", 409);
  const passwordHash = await hashPassword(input.password);
  const role = await prisma.role.findFirst({ where: { name: "USER" } }) ?? await prisma.role.findFirst({ where: { name: "ATTENDEE" } });
  if (!role) throw new AuthError("CONFIGURATION_ERROR", "Authentication is not configured", 500);
  const user = await prisma.user.create({ data: { name: input.name.trim(), email, passwordHash, roles: { create: { roleId: role.id } } } });
  const rawToken = randomToken();
  await db.$executeRaw`INSERT INTO "verification_token" ("id", "user_id", "token_hash", "type", "expires_at", "created_at") VALUES (${crypto.randomUUID()}, ${user.id}, ${hashToken(rawToken)}, 'EMAIL_VERIFICATION', CURRENT_TIMESTAMP + INTERVAL '24 hours', CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "email_outbox" ("id", "recipient", "subject", "body", "created_at") VALUES (${crypto.randomUUID()}, ${email}, 'Verify your Festify account', ${`Use this verification token: ${rawToken}`}, CURRENT_TIMESTAMP)`;
  const session = await issueSession(user.id, "USER", req?.ip, String(req?.headers?.["user-agent"] ?? ""));
  await audit(user.id, "REGISTER", "USER", user.id);
  return { user: safeUser(user, ["USER"]), ...session, ...(env.devTokens ? { devToken: rawToken } : {}) };
}
export async function loginUser(input: { email: string; password: string }, req?: { ip?: string; headers?: Record<string, unknown> }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { roles: { include: { role: true } } } });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(input.password, user.passwordHash))) throw new AuthError("UNAUTHENTICATED", "Invalid credentials", 401);
  const roles = await rolesFor(user.id); const role = roles.includes("ADMIN") ? "ADMIN" : roles.includes("ORGANIZER") ? "ORGANIZER" : "USER";
  const session = await issueSession(user.id, role, req?.ip, String(req?.headers?.["user-agent"] ?? ""));
  await audit(user.id, "LOGIN", "USER", user.id);
  return { user: safeUser(user, roles), role, ...session };
}
export async function revokeSession(sessionId: string, userId?: string) { await db.$executeRaw`UPDATE "session" SET "revoked_at"=CURRENT_TIMESTAMP WHERE "id"=${sessionId} AND (${userId ?? null}::text IS NULL OR "user_id"=${userId}) AND "revoked_at" IS NULL`; }
export async function rotateRefresh(raw: string, req?: { ip?: string; headers?: Record<string, unknown> }) {
  const hash = hashToken(raw);
  const rows = await db.$queryRaw<Array<any>>`SELECT s.*, u."status", u."id" AS uid FROM "session" s JOIN "user" u ON u."id"=s."user_id" WHERE s."refresh_token_hash"=${hash} LIMIT 1`;
  const old = rows[0];
  if (!old) throw new AuthError("UNAUTHENTICATED", "Invalid refresh token", 401);
  if (old.revoked_at) { await db.$executeRaw`UPDATE "session" SET "revoked_at"=CURRENT_TIMESTAMP WHERE "family_id"=${old.family_id} AND "revoked_at" IS NULL`; await audit(old.uid, "REFRESH_REUSE_DETECTED", "SESSION", old.id); throw new AuthError("UNAUTHENTICATED", "Invalid refresh token", 401); }
  if (new Date(old.expires_at) <= new Date() || old.status !== "ACTIVE") throw new AuthError("UNAUTHENTICATED", "Invalid refresh token", 401);
  const roles = await rolesFor(old.uid); const role = roles.includes("ADMIN") ? "ADMIN" : roles.includes("ORGANIZER") ? "ORGANIZER" : "USER";
  const next = await issueSession(old.uid, role, req?.ip, String(req?.headers?.["user-agent"] ?? ""), old.family_id);
  await db.$executeRaw`UPDATE "session" SET "revoked_at"=CURRENT_TIMESTAMP, "replaced_by_id"=${next.sessionId} WHERE "id"=${old.id} AND "revoked_at" IS NULL`;
  return { userId: old.uid, role, ...next };
}
export async function verifyEmail(raw: string) {
  const rows = await db.$queryRaw<Array<any>>`SELECT * FROM "verification_token" WHERE "token_hash"=${hashToken(raw)} AND "type"='EMAIL_VERIFICATION' LIMIT 1`; const token = rows[0];
  if (!token || token.used_at || new Date(token.expires_at) <= new Date()) throw new AuthError("INVALID_TOKEN", "Invalid or expired verification token", 400);
  await db.$executeRaw`UPDATE "verification_token" SET "used_at"=CURRENT_TIMESTAMP WHERE "id"=${token.id} AND "used_at" IS NULL`;
  await db.$executeRaw`UPDATE "user" SET "email_verified_at"=CURRENT_TIMESTAMP WHERE "id"=${token.user_id}`; await audit(token.user_id, "EMAIL_VERIFIED", "USER", token.user_id); return { verified: true };
}
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } }); if (!user) return;
  const raw = randomToken(); await db.$executeRaw`INSERT INTO "verification_token" ("id", "user_id", "token_hash", "type", "expires_at", "created_at") VALUES (${crypto.randomUUID()}, ${user.id}, ${hashToken(raw)}, 'PASSWORD_RESET', CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP)`;
  await db.$executeRaw`INSERT INTO "email_outbox" ("id", "recipient", "subject", "body", "created_at") VALUES (${crypto.randomUUID()}, ${user.email}, 'Reset your Festify password', ${`Use this password reset token: ${raw}`}, CURRENT_TIMESTAMP)`; return env.devTokens ? { devToken: raw } : undefined;
}
export async function resetPassword(raw: string, password: string) {
  const rows = await db.$queryRaw<Array<any>>`SELECT * FROM "verification_token" WHERE "token_hash"=${hashToken(raw)} AND "type"='PASSWORD_RESET' LIMIT 1`; const token = rows[0];
  if (!token || token.used_at || new Date(token.expires_at) <= new Date()) throw new AuthError("INVALID_TOKEN", "Invalid or expired reset token", 400);
  await prisma.user.update({ where: { id: token.user_id }, data: { passwordHash: await hashPassword(password) } }); await db.$executeRaw`UPDATE "verification_token" SET "used_at"=CURRENT_TIMESTAMP WHERE "id"=${token.id}`; await db.$executeRaw`UPDATE "session" SET "revoked_at"=CURRENT_TIMESTAMP WHERE "user_id"=${token.user_id} AND "revoked_at" IS NULL`; await audit(token.user_id, "PASSWORD_RESET", "USER", token.user_id);
}
export async function changePassword(userId: string, current: string, next: string, sessionId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } }); if (!user || !(await verifyPassword(current, user.passwordHash))) throw new AuthError("UNAUTHENTICATED", "Current password is incorrect", 401);
  if (await verifyPassword(next, user.passwordHash)) throw new AuthError("VALIDATION_ERROR", "New password must be different", 400);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }); await db.$executeRaw`UPDATE "session" SET "revoked_at"=CURRENT_TIMESTAMP WHERE "user_id"=${userId} AND "id"<>${sessionId} AND "revoked_at" IS NULL`; await audit(userId, "PASSWORD_CHANGED", "USER", userId);
}

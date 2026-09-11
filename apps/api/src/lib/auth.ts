import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "festify_access";
export const REFRESH_COOKIE = "festify_refresh";
export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const randomToken = () => crypto.randomBytes(48).toString("base64url");
export const createAccessToken = (userId: string, role: string, sessionId: string) => jwt.sign({ sub: userId, role, sid: sessionId }, env.jwtSecret, { algorithm: "HS256", expiresIn: ACCESS_TTL_SECONDS });
export const accessCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: ACCESS_TTL_SECONDS * 1000 };
export const refreshCookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/api/v1/auth", maxAge: REFRESH_TTL_SECONDS * 1000 };
export function clearAuthCookies(res: { clearCookie: (name: string, options?: object) => void }) { res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions, maxAge: undefined }); res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined }); }

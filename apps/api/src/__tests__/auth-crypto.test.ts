import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { createAccessToken, hashToken, randomToken, ACCESS_TTL_SECONDS } from "../lib/auth.js";
import { validatePassword } from "../lib/password.js";

describe("authentication primitives", () => {
  it("hashes opaque refresh tokens deterministically without exposing them", () => {
    const token = randomToken();
    expect(Buffer.from(token, "base64url").length).toBeGreaterThanOrEqual(48);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
  it("creates a short-lived HS256 access token with session claims", () => {
    const token = createAccessToken("user-1", "USER", "session-1");
    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe("user-1"); expect(decoded.role).toBe("USER"); expect(decoded.sid).toBe("session-1");
    expect(decoded.exp - decoded.iat).toBe(ACCESS_TTL_SECONDS);
  });
  it("enforces password strength and common-pattern rejection", () => {
    expect(validatePassword("short1A")).toBeTruthy();
    expect(validatePassword("password123A")).toBeTruthy();
    expect(validatePassword("SecureFestify123")).toBeUndefined();
  });
});

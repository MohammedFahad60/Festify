import { z } from "zod";

const password = z.string().min(8).max(72).regex(/[A-Z]/, "Password must contain an uppercase letter").regex(/[a-z]/, "Password must contain a lowercase letter").regex(/[0-9]/, "Password must contain a number").refine((value) => !/(password|12345678|qwerty|letmein)/i.test(value), "Password is too common");
const email = z.string().trim().toLowerCase().email().max(254);
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email, password }).strict();
export const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();
export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(256), password }).strict();
export const verifyEmailSchema = z.object({ token: z.string().min(32).max(256) }).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(72), newPassword: password }).strict();
export const organizerUpgradeSchema = z.object({ organizationName: z.string().trim().min(2).max(160), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/), bio: z.string().trim().max(2000).optional(), website: z.string().url().optional() }).strict();
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

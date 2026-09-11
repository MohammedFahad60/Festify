import bcrypt from "bcrypt";

export const PASSWORD_COST = 12;
export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (/(password|12345678|qwerty|letmein)/i.test(password)) return "Password is too common";
  return undefined;
}
export const hashPassword = (password: string) => bcrypt.hash(password, PASSWORD_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

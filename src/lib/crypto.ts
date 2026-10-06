import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Comparaison à temps constant. */
export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

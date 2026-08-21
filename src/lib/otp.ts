/**
 * OTP / session primitives (pure crypto helpers, no I/O).
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_CODE_LENGTH = 6;
export const OTP_CODE_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_INTERVAL_MS = 60_000;

/** 6-digit numeric code, e.g. "482913". */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_CODE_LENGTH)
    .toString()
    .padStart(OTP_CODE_LENGTH, "0");
}

/** SHA-256 hash — used for OTP codes at rest. */
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison of two hashed values. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

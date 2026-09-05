import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed session tokens for the single admin account.
 *
 * Kept free of Next.js imports so it can be tested directly: this is the whole
 * of the admin authentication boundary, and a mistake here is not the kind of
 * bug that shows up in the UI.
 *
 * Format: `<expiryMs>.<hmac>`. The expiry is inside the signature, so a
 * visitor cannot extend their own session by editing the cookie.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(secret: string, expiresAt: number) {
  return createHmac("sha256", secret).update(`admin:${expiresAt}`).digest("base64url");
}

export function createToken(secret: string, now = Date.now(), ttlMs = TTL_MS) {
  const expiresAt = now + ttlMs;
  return { token: `${expiresAt}.${sign(secret, expiresAt)}`, expiresAt: new Date(expiresAt) };
}

/** True only for a token this secret signed and that has not expired. */
export function verifyToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret) return false;

  const split = token.indexOf(".");
  if (split < 1) return false;

  const expiresAt = Number(token.slice(0, split));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;

  return equals(token.slice(split + 1), sign(secret, expiresAt));
}

/** Constant-time compare that tolerates unequal lengths. */
function equals(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, and the length of a base64url
  // HMAC is fixed anyway, so an early return here leaks nothing useful.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Compares a submitted password with the configured one in constant time.
 * Both sides are hashed first so the buffers are always the same length.
 */
export function passwordMatches(submitted: string, expected: string | undefined) {
  if (!expected) return false;
  const hash = (value: string) => createHmac("sha256", "pw").update(value).digest();
  return timingSafeEqual(hash(submitted), hash(expected));
}

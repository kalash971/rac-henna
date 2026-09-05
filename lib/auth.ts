import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, verifyToken } from "./session-token";

const COOKIE = "rac_admin";

/** Admin is off unless both secrets are set — no default password, ever. */
export function adminConfigured() {
  return !!(process.env.AUTH_SECRET && process.env.ADMIN_PASSWORD && process.env.MONGODB_URI);
}

/**
 * Memoised for the render pass, so a page and its children can each ask
 * without re-reading the cookie.
 */
export const isAdmin = cache(async () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  return verifyToken((await cookies()).get(COOKIE)?.value, secret);
});

export async function startSession() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const { token, expiresAt } = createToken(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** For pages: send an unauthenticated visitor to the login screen. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/**
 * For Server Functions. Next's own docs are blunt about this: actions are
 * reachable by direct POST, not only through the UI, so the gate has to be
 * inside every one of them rather than in the layout that renders the button.
 */
export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

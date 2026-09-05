import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // Belt and braces alongside robots.ts — nothing under /admin should ever
  // turn up in a search result.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Never cached, never prerendered.
 *
 * Without this the rendering mode depends on whether AUTH_SECRET happened to
 * be set at build time: with it absent, the session check short-circuits
 * before reading cookies, the route prerenders a redirect to the login page,
 * and adding the variable later would not dislodge it.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

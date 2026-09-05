import Link from "next/link";
import { RotateCw } from "lucide-react";

/**
 * Shown when a dashboard query fails — in practice, always the database.
 *
 * This is handled in the pages rather than through an `error.tsx` boundary:
 * the throw happens while the shell is still rendering, so the boundary never
 * got a chance and the visitor saw a raw 500 instead. Catching it where the
 * query is made is deterministic.
 */
export function DataError({ retry, detail }: { retry: string; detail?: string }) {
  return (
    <div className="mt-8 rounded-3xl border border-danger/40 bg-danger/10 p-6 sm:p-8">
      <h2 className="font-display text-3xl text-ivory">Could not reach the database</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Nothing is lost. This is the connection, not your data. The usual causes:
      </p>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {[
          "The database user's password does not match MONGODB_URI (Atlas → Database Access → Edit → Reset password).",
          "Atlas Network Access does not allow 0.0.0.0/0, and serverless functions have no fixed IP.",
          "The cluster is paused. Free clusters pause themselves after being idle.",
        ].map((cause) => (
          <li key={cause} className="flex gap-2">
            <span aria-hidden className="text-gold">
              ·
            </span>
            {cause}
          </li>
        ))}
      </ul>

      {/* Only in development: a visitor-facing page must not leak internals. */}
      {process.env.NODE_ENV === "development" && detail && (
        <pre className="mt-5 overflow-x-auto rounded-xl border border-line bg-ink p-3 text-xs text-danger">
          {detail}
        </pre>
      )}

      <Link
        href={retry}
        prefetch={false}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-gold-soft"
      >
        <RotateCw className="size-4" aria-hidden />
        Try again
      </Link>
    </div>
  );
}

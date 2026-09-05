"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { login } from "../actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-16">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-henna-deep/45 text-gold ring-1 ring-gold/25">
        <Lock className="size-5" strokeWidth={1.6} aria-hidden />
      </div>

      <h1 className="mt-6 font-display text-4xl text-ivory">
        RAC<span className="text-gold">_</span>Henna
      </h1>
      <p className="mt-2 text-sm text-muted">Dashboard sign in.</p>

      <form action={action} className="mt-8">
        <label htmlFor="password" className="text-sm font-medium text-ivory">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={!!error}
          aria-describedby={error ? "login-error" : undefined}
          className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-ink px-4 text-base text-ivory transition-colors focus:border-gold focus:outline-none"
        />

        {/* aria-live so a screen reader hears the failure, which is otherwise
            the only feedback this form gives. */}
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          className="mt-2 min-h-5 text-xs text-danger"
        >
          {error}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 h-12 w-full rounded-full bg-gold text-sm font-medium text-ink transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>

      <Link href="/" className="mt-8 text-center text-xs text-muted hover:text-gold">
        Back to the site
      </Link>
    </main>
  );
}

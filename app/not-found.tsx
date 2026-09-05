import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Home, Images } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Replaces the framework's built-in 404, which is unstyled black-on-white
 * markup and ignores the theme entirely.
 *
 * The mandala draws itself in, so the page has something to look at while the
 * visitor works out where they meant to go.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center overflow-hidden px-5 py-24 sm:px-8">
      {/* This page sits outside the site nav, so it carries its own toggle —
          the theme should be switchable from anywhere. */}
      <div className="absolute top-5 right-5 z-10 sm:top-6 sm:right-8">
        <ThemeToggle />
      </div>

      {/* Decorative: a single mandala ring, drawn rather than dropped in. */}
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        className="drift pointer-events-none absolute top-1/2 left-1/2 w-[min(150vw,760px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.16]"
      >
        <g fill="none" stroke="var(--color-gold)" strokeWidth="1.2" strokeLinecap="round">
          {[80, 118, 156].map((r, ring) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              className="draw"
              style={{ ["--len" as string]: `${2 * Math.PI * r}`, animationDelay: `${ring * 260}ms` }}
            />
          ))}
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d="M200 44 C 222 74, 222 104, 200 134 C 178 104, 178 74, 200 44 Z"
              transform={`rotate(${i * 22.5} 200 200)`}
              className="draw"
              style={{ ["--len" as string]: "260", animationDelay: `${600 + i * 55}ms` }}
            />
          ))}
        </g>
      </svg>

      <div className="relative mx-auto w-full max-w-xl text-center">
        <p className="eyebrow rise" style={{ ["--i" as string]: 0 }}>
          404
        </p>

        <h1
          className="rise mt-5 text-[clamp(2.25rem,9vw,4.5rem)] leading-[1.02] text-ivory"
          style={{ ["--i" as string]: 1 }}
        >
          This page has <em className="text-gold italic">faded</em>.
        </h1>

        <p
          className="rise mx-auto mt-6 max-w-sm text-base leading-relaxed text-muted"
          style={{ ["--i" as string]: 2 }}
        >
          Like a stain after three weeks. The page you wanted is not here, but
          the bookings are still open.
        </p>

        <div
          className="rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ ["--i" as string]: 3 }}
        >
          <Link
            href="/"
            className="group inline-flex h-13 min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-gold px-7 text-base font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-gold-soft active:scale-[0.98] sm:w-auto"
          >
            <Home className="size-4" aria-hidden />
            Back to the start
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          <Link
            href="/#gallery"
            className="inline-flex h-13 min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line px-7 text-base text-ivory transition-colors duration-200 hover:border-gold/60 hover:text-gold sm:w-auto"
          >
            <Images className="size-4" aria-hidden />
            See the gallery
          </Link>
        </div>

        <p className="rise mt-10 text-sm text-muted" style={{ ["--i" as string]: 4 }}>
          Or just message me on{" "}
          <a
            href={site.wa("Hi RAC_Henna! I would like to enquire about a mehndi booking.")}
            target="_blank"
            rel="noopener noreferrer"
            className="link-grow text-gold"
          >
            WhatsApp
          </a>
          .
        </p>
      </div>
    </main>
  );
}

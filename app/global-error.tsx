"use client";

/**
 * Last resort: this replaces the root layout, so it cannot rely on the app's
 * CSS, fonts or theme boot script having loaded. Everything is inline, and the
 * palette is the dark one because that is the brand default.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1.25rem",
          background: "radial-gradient(60% 55% at 50% 40%, #3a1d10 0%, #1f120b 45%, #120a07 100%)",
          color: "#f7efe4",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <svg viewBox="0 0 32 32" width="44" height="44" aria-hidden style={{ opacity: 0.9 }}>
            <path
              d="M16 4c7 1 10 7 8 12s-8 8-12 6 0-6 3-6 5 3 3 6-6 4-9 1"
              fill="none"
              stroke="#d9a94c"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="16" cy="27" r="1.6" fill="#d9a94c" />
          </svg>

          <h1
            style={{
              margin: "1.25rem 0 0",
              fontFamily: '"Iowan Old Style", Georgia, serif',
              fontWeight: 300,
              fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
              letterSpacing: "-0.015em",
            }}
          >
            Something went wrong
          </h1>

          <p style={{ margin: "0.75rem 0 0", fontSize: "0.9375rem", lineHeight: 1.7, color: "#c3ab95" }}>
            The page could not be loaded. Bookings are still open — call{" "}
            <a href="tel:+919901349272" style={{ color: "#d9a94c" }}>
              9901349272
            </a>{" "}
            or message{" "}
            <a href="https://wa.me/916363244824" style={{ color: "#d9a94c" }}>
              WhatsApp
            </a>
            .
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              minHeight: "2.75rem",
              padding: "0 1.5rem",
              border: 0,
              borderRadius: "999px",
              background: "#d9a94c",
              color: "#120a07",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

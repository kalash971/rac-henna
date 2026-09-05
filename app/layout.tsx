import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CALL, INSTAGRAM, WHATSAPP, site } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — Bridal & Occasion Mehndi Artist`,
    template: `%s · ${site.name}`,
  },
  description:
    "RAC_Henna creates bridal, engagement, festival and baby-shower mehndi with natural paste and deep, lasting stain. Bookings open — call or WhatsApp to hold your date.",
  keywords: [
    "mehndi artist",
    "bridal mehndi",
    "henna artist",
    "engagement mehndi",
    "baby shower mehndi",
    "RAC_Henna",
  ],
  openGraph: {
    title: `${site.name} — Bridal & Occasion Mehndi Artist`,
    description: site.tagline,
    type: "website",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  // So the browser chrome matches whichever palette is showing.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#120a07" },
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Rich result for a local service business. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  name: site.name,
  description: site.tagline,
  telephone: `+91${CALL}`,
  priceRange: "₹₹",
  sameAs: [site.instagramHref, `https://wa.me/91${WHATSAPP}`],
  makesOffer: [
    "Bridal Mehndi",
    "Engagement Mehndi",
    "Festival Mehndi",
    "Baby Shower Mehndi",
    "Wedding & Occasion Mehndi",
  ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
  author: { "@type": "Person", alternateName: `@${INSTAGRAM}` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable}`}
      /*
       * The boot script below sets data-theme before React hydrates, so this
       * element deliberately differs from the server HTML — the server cannot
       * know a choice that lives in localStorage.
       *
       * Reading it from a cookie instead would let the server render it and
       * remove the mismatch, but touching cookies in the root layout makes
       * every route dynamic and would cost the home page its static prerender.
       *
       * This suppression covers only this element's own attributes; mismatches
       * anywhere in the tree below still report normally.
       */
      suppressHydrationWarning
    >
      <body>
        {/*
          Injected into the initial HTML and run before any Next.js code, so
          data-theme is set before a single pixel paints and a light-theme
          visitor never sees a dark flash.
        */}
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}

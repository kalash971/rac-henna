"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { InstagramIcon } from "./icons";
import { ThemeToggle } from "./theme";
import { CALL, site } from "@/lib/site";

const links = [
  { href: "#services", label: "Services" },
  { href: "#gallery", label: "Gallery" },
  { href: "#how", label: "How it works" },
  { href: "#journey", label: "My journey" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Close the sheet on Escape, and stop the page scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ${
          scrolled
            ? "border-b border-line/70 bg-ink/85 backdrop-blur-md"
            : "border-b border-transparent"
        }`}
      >
        <div aria-hidden className="nav-veil pointer-events-none absolute inset-0 -z-10" />

        <nav
          aria-label="Main"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <a
            href="#top"
            className="flex items-center gap-2.5 text-gold transition-colors hover:text-gold-soft"
          >
            <Image src="/logo.png" alt="" width={48} height={48} priority className="size-12 shrink-0 rounded-full" />
            <span className="font-display text-2xl leading-none tracking-tight text-ivory">
              RAC<span className="text-gold">_</span>Henna
            </span>
          </a>

          <ul className="hidden items-center gap-9 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="relative text-sm text-muted transition-colors hover:text-ivory after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href={site.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="RAC_Henna on Instagram, opens in a new tab"
              className="hidden size-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold/60 hover:text-gold sm:flex"
            >
              <InstagramIcon className="size-[18px]" />
            </a>
            <a
              href={site.wa("Hi! I would like to enquire about a mehndi booking.")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-ink transition-[transform,background-color] duration-200 hover:bg-gold-soft active:scale-[0.97] sm:inline-flex"
            >
              <MessageCircle className="size-4" aria-hidden />
              Book a date
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="flex size-11 items-center justify-center rounded-full border border-line text-ivory lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-ink-2 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xl text-ivory">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-11 items-center justify-center rounded-full border border-line text-ivory"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="mt-6 space-y-1">
              {[...links, { href: "#book", label: "Book now" }].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-4 font-display text-2xl text-ivory transition-colors hover:bg-ink-3"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <a
                href={site.callHref}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm text-ivory"
              >
                <Phone className="size-4" aria-hidden />
                Call
              </a>
              <a
                href={site.wa("Hi! I would like to enquire about a mehndi booking.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-sm font-medium text-ink"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Calls &amp; enquiries: {CALL}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

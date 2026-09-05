"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { InstagramIcon } from "./icons";
import { MandalaArt } from "./mandala-art";
import { saveEnquiry } from "@/app/actions";
import { LIMITS, buildEnquiry, localToday } from "@/lib/enquiry";
import {
  CALL,
  INSTAGRAM,
  WHATSAPP,
  type GalleryFilter,
  type GalleryPhoto,
  galleryFilters,
  services,
  site,
  steps,
} from "@/lib/site";

const SILK = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: SILK }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-4xl leading-[1.08] text-ivory sm:text-5xl">{title}</h2>
      {lead && <p className="mt-5 text-base leading-relaxed text-muted">{lead}</p>}
    </Reveal>
  );
}

/* ---------------------------------------------------------------- Hero */

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-dvh items-start pt-28 pb-24 sm:items-center sm:pb-20">
      <div aria-hidden className="hero-veil pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <motion.div
          className="relative z-10 max-w-3xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: SILK }}
        >
          <p className="eyebrow">Bookings open · 2026 dates</p>

          <h1 className="mt-6 text-[clamp(2.25rem,10vw,6.5rem)] leading-[0.94] tracking-tight text-ivory">
            Henna that holds
            <br />
            your <em className="text-gold italic">story</em>.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
            I have started my henna journey with RAC_Henna — hand-drawn mehndi for
            brides, engagements, festivals and baby showers. Every design is drawn
            around you, never traced from a book.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={site.wa(
                "Hi RAC_Henna! I would like to check your availability for a mehndi booking."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-gold px-8 text-base font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-gold-soft active:scale-[0.98]"
            >
              <MessageCircle className="size-5" aria-hidden />
              Book your date
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </a>
            <a
              href="#gallery"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-line px-8 text-base text-ivory transition-colors duration-200 hover:border-gold/60 hover:text-gold"
            >
              See the work
            </a>
          </div>

          {/* ponytail: confirm this copy before launch — it is brand promise, not fact I can verify. */}
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
            {["Bridal to baby shower", "Natural, skin-kind paste", "Designs made for you"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-mehndi" aria-hidden />
                  {t}
                </li>
              )
            )}
          </ul>
        </motion.div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink/90"
      />
    </section>
  );
}

/* ------------------------------------------------------------ Services */

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead
          eyebrow="What I do"
          title={
            <>
              Mehndi for every kind of <span className="text-gold">celebration</span>
            </>
          }
          lead="Five ways to work together. Tell me the occasion and I will tell you what it needs — coverage, time on the day, and how early to book."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={i * 0.06}>
              <article className="glass group flex h-full flex-col rounded-3xl p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 sm:p-7 hover:border-gold/45">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-henna-deep/45 text-gold ring-1 ring-gold/25">
                  <s.icon className="size-6" strokeWidth={1.6} aria-hidden />
                </div>
                <h3 className="mt-6 text-2xl text-ivory">{s.title}</h3>
                <p className="mt-1 text-xs tracking-widest text-gold/85 uppercase">{s.blurb}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{s.detail}</p>
                <a
                  href={site.wa(`Hi RAC_Henna! I would like to enquire about ${s.title}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 -mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-ivory transition-colors hover:text-gold"
                >
                  Enquire about {s.title.toLowerCase()}
                  <ArrowUpRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </a>
              </article>
            </Reveal>
          ))}

          <Reveal delay={services.length * 0.06}>
            <article className="flex h-full flex-col justify-between rounded-3xl border border-gold/30 bg-gradient-to-br from-henna-deep/55 to-ink-2 p-6 sm:p-7">
              <Sparkles className="size-6 text-gold" strokeWidth={1.6} aria-hidden />
              <div className="mt-6">
                <h3 className="text-2xl text-ivory">Something else in mind?</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/75">
                  Birthdays, house functions, a group of friends before a wedding — if it
                  calls for mehndi, ask me.
                </p>
                <a
                  href={site.callHref}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-soft"
                >
                  <Phone className="size-4" aria-hidden />
                  Call {CALL}
                </a>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Gallery */

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState<GalleryFilter>("All");

  // Only offer a filter that would actually return something.
  const filters = useMemo(
    () => galleryFilters.filter((f) => f === "All" || photos.some((p) => p.category === f)),
    [photos]
  );
  const shown = useMemo(
    () => (filter === "All" ? photos : photos.filter((p) => p.category === filter)),
    [filter, photos]
  );

  return (
    <section id="gallery" className="scroll-mt-20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            eyebrow="Selected work"
            title={
              <>
                The <span className="text-gold">gallery</span>
              </>
            }
            lead="Bridal detail, lighter engagement work and festival mandalas. Filter to what you are planning."
          />

          <Reveal delay={0.1}>
            <div
              role="group"
              aria-label="Filter gallery by occasion"
              className="flex flex-wrap gap-2"
            >
              {filters.map((f) => {
                const active = f === filter;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={active}
                    className={`h-11 rounded-full border px-3.5 text-[13px] transition-colors duration-200 sm:px-5 sm:text-sm ${
                      active
                        ? "border-gold bg-gold text-ink"
                        : "border-line text-muted hover:border-gold/50 hover:text-ivory"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <motion.ul layout className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4, ease: SILK }}
                className="group relative overflow-hidden rounded-3xl border border-line bg-ink-2"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {item.url ? (
                    <Image
                      src={item.url}
                      alt={item.label}
                      fill
                      // Two-up on a phone, three-up from the large breakpoint.
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    <MandalaArt
                      seed={item.seed ?? 1}
                      className="size-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-3 pt-12 sm:p-4">
                  <p className="text-xs tracking-widest text-gold uppercase">{item.category}</p>
                  <p className="mt-1 text-[13px] leading-snug text-ivory sm:text-sm">{item.label}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        <Reveal className="mt-10">
          <a
            href={site.instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-gold"
          >
            <InstagramIcon className="size-[18px]" />
            More on Instagram — @{INSTAGRAM}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- How it works */

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              Four steps, no <span className="text-gold">guesswork</span>
            </>
          }
        />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.n} className="bg-ink-2 p-6 sm:p-7">
              <Reveal delay={i * 0.08}>
                <span className="font-display text-4xl text-gold/45">{s.n}</span>
                <h3 className="mt-4 text-xl text-ivory">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Journey */

export function Journey() {
  return (
    <section id="journey" className="scroll-mt-20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
        <SectionHead
          eyebrow="My journey"
          title={
            <>
              A small business, <span className="text-gold">started with love</span>
            </>
          }
          lead="RAC_Henna is new, and it is mine. Every booking is a real day in someone's life, and I treat it that way — unhurried hands, natural paste, and a design that belongs to you and no one else."
        />

        <Reveal delay={0.12}>
          <div className="glass rounded-3xl p-6 sm:p-8 lg:p-10">
            <p className="font-display text-2xl leading-snug text-ivory sm:text-3xl">
              &ldquo;Your support would mean the world to me. If you or someone you know is
              looking for a mehndi artist, I would be grateful if you shared my work.&rdquo;
            </p>
            <p className="mt-6 text-sm tracking-widest text-gold uppercase">
              RAC_Henna · @{INSTAGRAM}
            </p>

            <div className="rule my-8" />

            <p className="text-sm leading-relaxed text-muted">
              Know someone getting married, or a festival coming up in the family? A
              forward is the kindest thing you can do for a small business.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={site.wa(
                  `Have a look at RAC_Henna — mehndi artist. Instagram: instagram.com/${INSTAGRAM} · Bookings: ${CALL}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 text-sm font-medium text-ink transition-colors hover:bg-gold-soft"
              >
                <MessageCircle className="size-4" aria-hidden />
                Share with a friend
              </a>
              <a
                href={site.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line px-6 text-sm text-ivory transition-colors hover:border-gold/60 hover:text-gold"
              >
                <InstagramIcon className="size-4" />
                Follow the journey
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Booking */

const occasions = services.map((s) => s.title);

export function Booking() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const today = useRef("");

  // Resolved on the client and written straight to the DOM: a server-rendered
  // "today" can disagree with the visitor's, and that is a hydration mismatch.
  useEffect(() => {
    today.current = localToday();
    if (dateRef.current) dateRef.current.min = today.current;
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const enquiry = {
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? ""),
      occasion: String(f.get("occasion") ?? ""),
      date: String(f.get("date") ?? ""),
      area: String(f.get("area") ?? ""),
      notes: String(f.get("notes") ?? ""),
    };
    const result = buildEnquiry(enquiry, today.current);

    if (!result.ok) {
      setErrors(result.errors);
      // Send focus to the first field that needs fixing.
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(result.errors)[0]}"]`)
        ?.focus();
      return;
    }

    setErrors({});

    // Opened synchronously, inside the click. After an `await` the browser no
    // longer counts this as a user gesture and blocks the popup — so WhatsApp,
    // which is the delivery path that matters, goes first.
    window.open(site.wa(result.message), "_blank", "noopener,noreferrer");
    setStatus("WhatsApp is open with your enquiry — press send and I will reply.");

    const saved = await saveEnquiry(enquiry);
    if (!saved.saved && saved.reason) {
      setStatus(`WhatsApp is open with your enquiry. ${saved.reason}`);
    }
  }

  const field =
    "mt-2 h-12 w-full rounded-xl border border-line-strong bg-ink px-4 text-base text-ivory placeholder:text-muted/60 transition-colors focus:border-gold focus:outline-none";
  const label = "text-sm font-medium text-ivory";
  const hint = "mt-1.5 text-xs text-muted";

  return (
    <section id="book" className="scroll-mt-20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead
          eyebrow="Bookings are open"
          title={
            <>
              Let us hold your <span className="text-gold">date</span>
            </>
          }
          lead="Fill this in and it opens WhatsApp with your details ready to send — or just call me. Bridal dates go first, so earlier is better."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          {/* Direct contact — always the fastest route, so it comes first on mobile */}
          <Reveal className="lg:col-span-2">
            <div className="flex h-full flex-col gap-3">
              {[
                {
                  href: site.callHref,
                  icon: Phone,
                  title: "Call me",
                  value: CALL,
                  note: "Enquiries and bookings",
                  external: false,
                },
                {
                  href: site.wa("Hi RAC_Henna! I would like to enquire about a mehndi booking."),
                  icon: MessageCircle,
                  title: "WhatsApp",
                  value: WHATSAPP,
                  note: "Fastest for photos and dates",
                  external: true,
                },
              ].map((c) => (
                <a
                  key={c.title}
                  href={c.href}
                  {...(c.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="glass group flex items-center gap-4 rounded-3xl p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 sm:p-6 hover:border-gold/45"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-henna-deep/45 text-gold ring-1 ring-gold/25">
                    <c.icon className="size-5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs tracking-widest text-gold uppercase">
                      {c.title}
                    </span>
                    <span className="block font-display text-2xl text-ivory tabular-nums">
                      {c.value}
                    </span>
                    <span className="block text-xs text-muted">{c.note}</span>
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold"
                    aria-hidden
                  />
                </a>
              ))}

              <a
                href={site.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="glass group flex items-center gap-4 rounded-3xl p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 sm:p-6 hover:border-gold/45"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-henna-deep/45 text-gold ring-1 ring-gold/25">
                  <InstagramIcon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs tracking-widest text-gold uppercase">
                    Instagram
                  </span>
                  <span className="block font-display text-2xl text-ivory">@{INSTAGRAM}</span>
                  <span className="block text-xs text-muted">New work posted first</span>
                </span>
                <ArrowUpRight
                  className="ml-auto size-5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold"
                  aria-hidden
                />
              </a>
            </div>
          </Reveal>

          {/* Enquiry form. No backend: it composes a WhatsApp message. */}
          <Reveal delay={0.1} className="lg:col-span-3">
            <form
              ref={formRef}
              onSubmit={submit}
              noValidate
              className="glass rounded-3xl p-5 sm:p-7 lg:p-9"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={label}>
                    Your name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={LIMITS.name}
                    placeholder="e.g. Aisha"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={field}
                  />
                  {errors.name && (
                    <p id="name-error" role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className={label}>
                    Phone <span className="text-danger">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={LIMITS.phone}
                    placeholder="10-digit mobile"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                    className={field}
                  />
                  {errors.phone ? (
                    <p id="phone-error" role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.phone}
                    </p>
                  ) : (
                    <p id="phone-hint" className={hint}>
                      So I can confirm your slot.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="occasion" className={label}>
                    Occasion <span className="text-danger">*</span>
                  </label>
                  <select
                    id="occasion"
                    name="occasion"
                    defaultValue=""
                    aria-invalid={!!errors.occasion}
                    aria-describedby={errors.occasion ? "occasion-error" : undefined}
                    className={field}
                  >
                    <option value="" disabled>
                      Choose one
                    </option>
                    {occasions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  {errors.occasion && (
                    <p id="occasion-error" role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.occasion}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="date" className={label}>
                    Date needed <span className="text-danger">*</span>
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    ref={dateRef}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? "date-error" : "date-hint"}
                    className={field}
                  />
                  {errors.date ? (
                    <p id="date-error" role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.date}
                    </p>
                  ) : (
                    <p id="date-hint" className={hint}>
                      Mehndi is usually 1–2 days before the function.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="area" className={label}>
                    Area or venue
                  </label>
                  <input
                    id="area"
                    name="area"
                    type="text"
                    maxLength={LIMITS.area}
                    placeholder="Where should I come?"
                    className={field}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="notes" className={label}>
                    Anything else?
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    maxLength={LIMITS.notes}
                    placeholder="Number of people, coverage you want, a reference you liked…"
                    className={`${field} h-auto resize-y py-3`}
                  />
                  <p className={hint}>
                    You can send reference photos on WhatsApp after this.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gold px-8 text-base font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-gold-soft active:scale-[0.99] sm:w-auto"
              >
                <MessageCircle className="size-5" aria-hidden />
                Send on WhatsApp
              </button>

              <p aria-live="polite" className="mt-4 min-h-5 text-sm text-mehndi">
                {status}
              </p>

              <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <CalendarDays className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Your name, number, date and notes are saved so I can find your booking
                later, and the same details open in WhatsApp for you to send.
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Footer */

export function Footer() {
  return (
    <footer className="relative bg-ink border-t border-line pt-12 pb-28 sm:py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-3xl text-ivory">
            RAC<span className="text-gold">_</span>Henna
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">{site.tagline}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
          {[
            { href: "#services", label: "Services" },
            { href: "#gallery", label: "Gallery" },
            { href: "#how", label: "How it works" },
            { href: "#journey", label: "My journey" },
            { href: "#book", label: "Book" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center text-muted transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="text-sm text-muted">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a href={site.callHref} className="link-grow tabular-nums hover:text-gold">
              {CALL}
            </a>
            <span aria-hidden className="text-gold/50">
              ·
            </span>
            <a
              href={site.wa("Hi RAC_Henna!")}
              target="_blank"
              rel="noopener noreferrer"
              className="link-grow hover:text-gold"
            >
              WhatsApp <span className="tabular-nums">{WHATSAPP}</span>
            </a>
          </p>
          <p className="mt-2">© {new Date().getFullYear()} RAC_Henna. Made with care.</p>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------- FAB */

/**
 * Always-reachable booking action on small screens — except while the booking
 * form is on screen, where it would float directly over the form's own submit
 * button and cover the one control that matters.
 */
export function WhatsAppFab() {
  const [atForm, setAtForm] = useState(false);

  useEffect(() => {
    const form = document.getElementById("book");
    if (!form) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAtForm(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      aria-hidden={atForm}
      tabIndex={atForm ? -1 : undefined}
      href={site.wa("Hi RAC_Henna! I would like to enquire about a mehndi booking.")}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-5 bottom-5 z-40 flex h-14 items-center gap-2.5 rounded-full bg-gold px-6 text-sm font-medium text-ink shadow-lg shadow-ink/60 transition-[transform,opacity] duration-300 active:scale-95 sm:hidden ${
        atForm ? "pointer-events-none translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <MessageCircle className="size-5" aria-hidden />
      Book now
    </a>
  );
}

/** Wraps the page so reduced-motion visitors get a still, readable site. */
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

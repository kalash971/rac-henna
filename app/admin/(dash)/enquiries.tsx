"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, MapPin, MessageCircle, Phone, Trash2 } from "lucide-react";
import { ENQUIRY_STATUSES, type Enquiry, type EnquiryStatus } from "@/lib/records";
import { waNumber } from "@/lib/enquiry";
import { removeEnquiry, updateNotes, updateStatus } from "../actions";

const STATUS_STYLE: Record<EnquiryStatus, string> = {
  new: "border-gold/60 bg-gold/15 text-gold",
  contacted: "border-mehndi/60 bg-mehndi/15 text-mehndi",
  booked: "border-ivory/40 bg-ivory/10 text-ivory",
  closed: "border-line bg-ink-2 text-muted",
};

/** Days until the event, or how long ago it was. */
function whenLabel(date: string) {
  const day = 86_400_000;
  const target = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  const days = Math.round((target - today) / day);

  if (days === 0) return { text: "today", urgent: true };
  if (days === 1) return { text: "tomorrow", urgent: true };
  if (days > 0) return { text: `in ${days} days`, urgent: days <= 7 };
  return { text: `${-days} days ago`, urgent: false };
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EnquiryBoard({ enquiries }: { enquiries: Enquiry[] }) {
  const [filter, setFilter] = useState<EnquiryStatus | "all">("all");

  const counts = useMemo(() => {
    const tally = { all: enquiries.length } as Record<string, number>;
    for (const status of ENQUIRY_STATUSES) {
      tally[status] = enquiries.filter((e) => e.status === status).length;
    }
    return tally;
  }, [enquiries]);

  const shown = filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);

  if (enquiries.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-line bg-ink-2 p-8 text-center">
        <p className="font-display text-2xl text-ivory">No enquiries yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Every booking form submission will land here, with a WhatsApp copy still going
          straight to your phone.
        </p>
      </div>
    );
  }

  return (
    <>
      <div role="group" aria-label="Filter by status" className="mt-8 flex flex-wrap gap-2">
        {(["all", ...ENQUIRY_STATUSES] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            aria-pressed={filter === status}
            className={`min-h-11 rounded-full border px-4 text-[13px] capitalize transition-colors ${
              filter === status
                ? "border-gold bg-gold text-ink"
                : "border-line text-muted hover:border-gold/50 hover:text-ivory"
            }`}
          >
            {status} <span className="tabular-nums opacity-70">{counts[status] ?? 0}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {shown.map((enquiry) => (
          <EnquiryCard key={enquiry.id} enquiry={enquiry} />
        ))}
      </ul>
    </>
  );
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(enquiry.adminNotes ?? "");
  const [confirming, setConfirming] = useState(false);
  const when = whenLabel(enquiry.eventDate);
  const wa = waNumber(enquiry.phone);

  return (
    <li
      className={`rounded-3xl border border-line bg-ink-2 p-5 transition-opacity sm:p-6 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-tight text-ivory">{enquiry.name}</p>
          <p className="mt-0.5 text-xs tracking-widest text-gold uppercase">
            {enquiry.occasion}
          </p>
        </div>

        <label className="sr-only" htmlFor={`status-${enquiry.id}`}>
          Status for {enquiry.name}
        </label>
        <select
          id={`status-${enquiry.id}`}
          value={enquiry.status}
          disabled={pending}
          onChange={(e) => start(() => void updateStatus(enquiry.id, e.target.value))}
          className={`min-h-11 rounded-full border px-4 text-[13px] capitalize ${
            STATUS_STYLE[enquiry.status]
          }`}
        >
          {ENQUIRY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
          <dt className="sr-only">Event date</dt>
          <dd className="text-ivory">
            {formatDate(enquiry.eventDate)}{" "}
            <span className={when.urgent ? "text-gold" : "text-muted"}>· {when.text}</span>
          </dd>
        </div>
        {enquiry.area && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
            <dt className="sr-only">Area</dt>
            <dd className="min-w-0 truncate text-ivory">{enquiry.area}</dd>
          </div>
        )}
      </dl>

      {enquiry.notes && (
        <p className="mt-4 rounded-2xl border border-line/60 bg-ink p-3 text-sm leading-relaxed text-muted">
          {enquiry.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${enquiry.phone}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[13px] text-ivory transition-colors hover:border-gold/60 hover:text-gold"
        >
          <Phone className="size-4" aria-hidden />
          <span className="tabular-nums">{enquiry.phone}</span>
        </a>
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(
            `Hi ${enquiry.name}! Thank you for your mehndi enquiry for ${formatDate(
              enquiry.eventDate
            )}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-4 text-[13px] font-medium text-ink transition-colors hover:bg-gold-soft"
        >
          <MessageCircle className="size-4" aria-hidden />
          Reply
        </a>

        <div className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => start(() => void removeEnquiry(enquiry.id))}
                className="inline-flex min-h-11 items-center rounded-full bg-danger px-4 text-[13px] font-medium text-ink"
              >
                Delete for good
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-[13px] text-muted"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete the enquiry from ${enquiry.name}`}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <label htmlFor={`notes-${enquiry.id}`} className="mt-4 block text-xs text-muted">
        Your notes
      </label>
      <textarea
        id={`notes-${enquiry.id}`}
        value={notes}
        rows={2}
        maxLength={2000}
        placeholder="Quoted ₹…, advance taken, design agreed…"
        onChange={(e) => setNotes(e.target.value)}
        // Saved on blur rather than per keystroke: one write when she is done.
        onBlur={() => {
          if (notes !== (enquiry.adminNotes ?? "")) {
            start(() => void updateNotes(enquiry.id, notes));
          }
        }}
        className="mt-1.5 w-full resize-y rounded-xl border border-line-strong bg-ink px-3 py-2 text-sm text-ivory placeholder:text-muted/50 focus:border-gold focus:outline-none"
      />

      <p className="mt-2 text-xs text-muted">
        Received {new Date(enquiry.createdAt).toLocaleString()}
      </p>
    </li>
  );
}

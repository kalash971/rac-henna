"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import type { GalleryItem } from "@/lib/records";
import { galleryFilters } from "@/lib/site";
import {
  addPhoto,
  editPhoto,
  movePhoto,
  removePhoto,
  requestUploadTicket,
} from "../../actions";

const CATEGORIES = galleryFilters.filter((f) => f !== "All");
/** Cloudinary's free plan caps a single image at 10MB. */
const MAX_BYTES = 10 * 1024 * 1024;

export default function GalleryManager({ items }: { items: GalleryItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    let ticket;
    try {
      // One signed ticket covers the batch — the signed fields are identical
      // for every file and Cloudinary accepts a signature for an hour.
      ticket = await requestUploadTicket();
    } catch {
      setError("Cloudinary is not configured yet.");
      return;
    }

    for (const [index, file] of Array.from(files).entries()) {
      setBusy(`Uploading ${index + 1} of ${files.length}…`);
      try {
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name} is over 10MB. Shrink it and try again.`);
        }

        // Straight from the browser to Cloudinary: a phone photo is far past
        // the body limit a Server Function can accept. Every field here is
        // covered by the signature, so none of them can be tampered with.
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", ticket.apiKey);
        form.append("timestamp", String(ticket.timestamp));
        form.append("folder", ticket.folder);
        form.append("allowed_formats", ticket.allowed_formats);
        form.append("signature", ticket.signature);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`,
          { method: "POST", body: form }
        );
        const uploaded = await response.json();
        if (!response.ok) {
          throw new Error(uploaded?.error?.message ?? `Cloudinary rejected ${file.name}.`);
        }

        await addPhoto({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          category: CATEGORIES[0],
          // A filename is a poor caption, but better than an empty one until
          // she writes a real label.
          label: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        break;
      }
    }

    setBusy(null);
    if (input.current) input.current.value = "";
  }

  return (
    <>
      <div className="mt-8">
        <label
          htmlFor="photos"
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-dashed border-gold/45 bg-ink-2 px-6 py-6 text-sm text-ivory transition-colors hover:border-gold hover:bg-ink-3 sm:w-auto"
        >
          <Upload className="size-4 text-gold" aria-hidden />
          {busy ?? "Add photos — JPEG, PNG or WebP, up to 10MB each"}
        </label>
        <input
          ref={input}
          id="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={!!busy}
          onChange={(e) => void onFiles(e.target.files)}
          className="sr-only"
        />

        <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-xs text-danger">
          {error}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-line bg-ink-2 p-8 text-center">
          <p className="font-display text-2xl text-ivory">No photos yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Until you add some, the site shows the hand-drawn mandala placeholders. Your first
            upload replaces them.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <PhotoRow
              key={item.id}
              item={item}
              first={index === 0}
              last={index === items.length - 1}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function PhotoRow({
  item,
  first,
  last,
}: {
  item: GalleryItem;
  first: boolean;
  last: boolean;
}) {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(item.label);
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      className={`flex gap-4 rounded-3xl border border-line bg-ink-2 p-3 transition-opacity sm:p-4 ${
        pending ? "opacity-60" : ""
      } ${item.published ? "" : "border-dashed"}`}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-ink sm:size-24">
        <Image
          src={item.url}
          alt={item.label || "Gallery photo"}
          fill
          sizes="96px"
          className={`object-cover ${item.published ? "" : "opacity-40"}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <label htmlFor={`label-${item.id}`} className="sr-only">
          Caption
        </label>
        <input
          id={`label-${item.id}`}
          value={label}
          maxLength={120}
          placeholder="Caption, e.g. Full bridal hands"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label !== item.label) start(() => void editPhoto(item.id, { label }));
          }}
          className="h-11 w-full rounded-xl border border-line-strong bg-ink px-3 text-sm text-ivory placeholder:text-muted/50 focus:border-gold focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label htmlFor={`cat-${item.id}`} className="sr-only">
            Category
          </label>
          <select
            id={`cat-${item.id}`}
            value={item.category}
            onChange={(e) => start(() => void editPhoto(item.id, { category: e.target.value }))}
            className="min-h-11 rounded-full border border-line-strong bg-ink px-3 text-[13px] text-ivory"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => start(() => void editPhoto(item.id, { published: !item.published }))}
            aria-pressed={item.published}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors ${
              item.published
                ? "border-mehndi/60 bg-mehndi/15 text-mehndi"
                : "border-line text-muted"
            }`}
          >
            {item.published ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeOff className="size-4" aria-hidden />
            )}
            {item.published ? "Live" : "Hidden"}
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={first}
              onClick={() => start(() => void movePhoto(item.id, "up"))}
              aria-label="Move earlier"
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-gold disabled:opacity-25"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={last}
              onClick={() => start(() => void movePhoto(item.id, "down"))}
              aria-label="Move later"
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-gold disabled:opacity-25"
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>

            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={() => start(() => void removePhoto(item.id))}
                  className="inline-flex min-h-11 items-center rounded-full bg-danger px-3 text-[13px] font-medium text-ink"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-[13px] text-muted"
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={`Delete ${item.label || "this photo"}`}
                className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

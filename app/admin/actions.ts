"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUploadTicket, destroyImage, isOwnDeliveryUrl } from "@/lib/cloudinary";
import { assertAdmin, endSession, startSession } from "@/lib/auth";
import { passwordMatches } from "@/lib/session-token";
import {
  ENQUIRY_STATUSES,
  type EnquiryStatus,
  deleteEnquiry,
  deleteGalleryItem,
  insertGalleryItem,
  listGallery,
  reorderGallery,
  setEnquiryNotes,
  setEnquiryStatus,
  countRecent,
  record,
  updateGalleryItem,
} from "@/lib/db";
import { galleryFilters } from "@/lib/site";

/**
 * Every function here calls assertAdmin() first. Server Functions are POST
 * endpoints — the gate cannot live in the layout that renders the button.
 */

const LOGIN_ATTEMPT_LIMIT = 8;
const CATEGORIES = galleryFilters.filter((f) => f !== "All") as string[];

/* ----------------------------------------------------------------- login */

export async function login(_state: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");

  // Rate limited in the database, because a serverless function cannot count
  // attempts in memory and one shared password is exactly what gets guessed.
  //
  // Keyed by address, not globally: a global counter would let any stranger
  // lock the owner out of her own dashboard for a quarter of an hour.
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  if ((await countRecent("login", ip, 15)) >= LOGIN_ATTEMPT_LIMIT) {
    return "Too many attempts. Try again in 15 minutes.";
  }

  if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    // Only failures are charged against the limit.
    await record("login", ip);
    return "That password is not right.";
  }

  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------- enquiries */

function isStatus(value: string): value is EnquiryStatus {
  return (ENQUIRY_STATUSES as readonly string[]).includes(value);
}

export async function updateStatus(id: string, status: string) {
  await assertAdmin();
  if (!isStatus(status)) throw new Error("Unknown status");
  await setEnquiryStatus(id, status);
  revalidatePath("/admin");
}

export async function updateNotes(id: string, notes: string) {
  await assertAdmin();
  await setEnquiryNotes(id, notes.slice(0, 2000));
  revalidatePath("/admin");
}

export async function removeEnquiry(id: string) {
  await assertAdmin();
  await deleteEnquiry(id);
  revalidatePath("/admin");
}

/* --------------------------------------------------------------- gallery */

function cleanCategory(value: string) {
  return CATEGORIES.includes(value) ? value : CATEGORIES[0];
}

/**
 * Signs one direct upload for the browser.
 *
 * Replaces what used to be a route handler: a Server Function already carries
 * the session, and this returns data rather than handling the file itself.
 */
export async function requestUploadTicket() {
  await assertAdmin();
  const ticket = createUploadTicket();
  if (!ticket) throw new Error("Cloudinary is not configured");
  return ticket;
}

/**
 * Called once the browser has finished uploading. The file itself never passes
 * through a Server Function — a phone photo is well past the body limit.
 */
export async function addPhoto(input: {
  url: string;
  publicId: string;
  category: string;
  label: string;
}) {
  await assertAdmin();

  // Only accept a delivery URL from this Cloudinary account.
  if (!isOwnDeliveryUrl(input.url)) {
    throw new Error("That is not a Cloudinary URL for this account");
  }

  await insertGalleryItem({
    url: input.url,
    publicId: input.publicId.slice(0, 400),
    category: cleanCategory(input.category),
    label: input.label.trim().slice(0, 120),
  });
  updateTag("gallery");
  revalidatePath("/admin/gallery");
}

export async function editPhoto(
  id: string,
  patch: { category?: string; label?: string; published?: boolean }
) {
  await assertAdmin();
  await updateGalleryItem(id, {
    ...(patch.category !== undefined ? { category: cleanCategory(patch.category) } : {}),
    ...(patch.label !== undefined ? { label: patch.label.trim().slice(0, 120) } : {}),
    ...(patch.published !== undefined ? { published: patch.published } : {}),
  });
  updateTag("gallery");
  revalidatePath("/admin/gallery");
}

export async function removePhoto(id: string) {
  await assertAdmin();
  const publicId = await deleteGalleryItem(id);
  // The row is the source of truth; a stranded image still counts against her
  // storage quota, so try to clear it — but never fail the delete because
  // Cloudinary was unreachable.
  if (publicId) {
    try {
      await destroyImage(publicId);
    } catch {
      /* the row is gone either way */
    }
  }
  updateTag("gallery");
  revalidatePath("/admin/gallery");
}

/** Moves one photo one place earlier or later in her grid. */
export async function movePhoto(id: string, direction: "up" | "down") {
  await assertAdmin();
  const items = await listGallery();
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return;

  const ids = items.map((item) => item.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await reorderGallery(ids);

  updateTag("gallery");
  revalidatePath("/admin/gallery");
}

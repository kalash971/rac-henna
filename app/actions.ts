"use server";

import { headers } from "next/headers";
import { countRecent, insertEnquiry, record } from "@/lib/db";
import { buildEnquiry, type Enquiry } from "@/lib/enquiry";

/** How many enquiries one address may file in an hour. */
const LIMIT = 6;

export type SaveResult = { saved: boolean; reason?: string };

/**
 * Records a booking enquiry. The visitor's WhatsApp message is the primary
 * delivery path and is opened by the browser regardless — this is the copy
 * that lands in the dashboard, so a failure here is worth reporting but never
 * worth blocking on.
 */
export async function saveEnquiry(input: Enquiry): Promise<SaveResult> {
  // A day of slack: the visitor's calendar day and the server's can differ
  // either side of midnight, and rejecting a real booking is worse than
  // accepting a date that stopped being valid an hour ago.
  const floor = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Re-validated with the exact function the form used. The form is not the
  // only way to reach a Server Function.
  const result = buildEnquiry(input, floor);
  if (!result.ok) return { saved: false, reason: "Those details did not look right." };

  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || null;

  try {
    if (ip && (await countRecent("enquiry", ip, 60)) >= LIMIT) {
      return { saved: false, reason: "That is a lot of enquiries at once — send this one on WhatsApp." };
    }

    const id = await insertEnquiry({
      name: input.name.trim(),
      phone: input.phone.trim(),
      occasion: input.occasion,
      eventDate: input.date,
      area: input.area?.trim() || null,
      notes: input.notes?.trim() || null,
      ip,
    });

    if (ip) await record("enquiry", ip);

    // No database configured: WhatsApp still carried the enquiry.
    return { saved: id !== null };
  } catch {
    return { saved: false, reason: "Could not save it here, but WhatsApp has your message." };
  }
}

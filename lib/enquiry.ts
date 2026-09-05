/**
 * Booking enquiry validation and message building.
 *
 * Kept dependency-free and out of the component so it can be tested directly
 * with `npm test`. This is the site's only trust boundary — whatever passes
 * here is what ends up in the WhatsApp message.
 */

export type Enquiry = {
  name: string;
  phone: string;
  occasion: string;
  date: string;
  area?: string;
  notes?: string;
};

export type EnquiryResult =
  | { ok: true; message: string }
  | { ok: false; errors: Partial<Record<keyof Enquiry, string>> };

/**
 * Field caps. Used for the `maxLength` attributes on the form and enforced
 * again here, because the form is not the only way to reach the server action.
 */
export const LIMITS = { name: 80, phone: 24, occasion: 60, area: 120, notes: 800 } as const;

/** `today` is passed in so the caller decides whose clock counts. */
export function buildEnquiry(input: Enquiry, today: string): EnquiryResult {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const area = (input.area ?? "").trim();
  const notes = (input.notes ?? "").trim();

  const errors: Partial<Record<keyof Enquiry, string>> = {};
  if (name.length < 2) errors.name = "Please tell me your name so I know who I am replying to.";
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  const digits = onlyDigits(phone);
  if (!phone) errors.phone = "A number to reach you on, please.";
  else if (digits.length < 7 || digits.length > 15) errors.phone = "That does not look like a phone number.";

  if (!input.occasion) errors.occasion = "Pick the occasion you are booking for.";
  else if (input.occasion.length > LIMITS.occasion) errors.occasion = "That is not one of the occasions.";

  if (!input.date) errors.date = "Which date do you need me?";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = "Please pick a date.";
  else if (today && input.date < today) errors.date = "That date has already passed.";

  if (area.length > LIMITS.area) errors.area = `Please keep this under ${LIMITS.area} characters.`;
  if (notes.length > LIMITS.notes) errors.notes = `Please keep this under ${LIMITS.notes} characters.`;

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    message: [
      "Hi RAC_Henna! I would like to book mehndi.",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Occasion: ${input.occasion}`,
      `Date: ${input.date}`,
      area && `Area: ${area}`,
      notes && `Notes: ${notes}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Turns a submitted number into something wa.me will accept.
 *
 * A bare 10-digit number gets India's country code, matching the assumption
 * the rest of the site already makes about RAC_Henna's own numbers. Anything
 * already carrying a country code is left alone.
 */
export function waNumber(phone: string) {
  const digits = onlyDigits(phone);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

/** ISO date (YYYY-MM-DD) in the visitor's own timezone, not UTC. */
export function localToday(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

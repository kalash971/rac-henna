import type { LucideIcon } from "lucide-react";
import { Crown, Gem, Sparkles, Baby, HeartHandshake } from "lucide-react";

export const CALL = "9901349272";
export const WHATSAPP = "6363244824";
export const INSTAGRAM = "rac_henna";

export const site = {
  name: "RAC_Henna",
  tagline: "Mehndi artistry for the days you never forget",
  callHref: `tel:+91${CALL}`,
  instagramHref: `https://www.instagram.com/${INSTAGRAM}`,
  /** Opens WhatsApp with a prefilled enquiry. */
  wa: (message: string) => `https://wa.me/91${WHATSAPP}?text=${encodeURIComponent(message)}`,
};

export type Service = {
  slug: string;
  title: string;
  icon: LucideIcon;
  blurb: string;
  detail: string;
};

export const services: Service[] = [
  {
    slug: "bridal",
    title: "Bridal Mehndi",
    icon: Crown,
    blurb: "Full hands, arms and feet",
    detail:
      "The centrepiece. Dense, story-led detail woven around your own motifs — initials, a first meeting, a promise — with rich stain that deepens for days.",
  },
  {
    slug: "engagement",
    title: "Engagement",
    icon: Gem,
    blurb: "Lighter, camera-ready design",
    detail:
      "Elegant open work that photographs beautifully and sits well with your ring. Finished in comfortable time, so you are never rushed.",
  },
  {
    slug: "festival",
    title: "Festivals",
    icon: Sparkles,
    blurb: "Karwa Chauth, Eid, Diwali, Teej",
    detail:
      "Classic mandalas, jaali and floral trails. Bookings fill quickly around festival dates — reserve early to hold your slot.",
  },
  {
    slug: "baby-shower",
    title: "Baby Showers",
    icon: Baby,
    blurb: "Soft, gentle, mother-first",
    detail:
      "Calm designs and a calm pace, with skin-kind natural paste. Cradle, footprint and blessing motifs for the mother-to-be.",
  },
  {
    slug: "occasions",
    title: "Weddings & Occasions",
    icon: HeartHandshake,
    blurb: "Family, friends & guests",
    detail:
      "Sangeet, haldi, reception or a birthday at home. Guest-side mehndi for groups, priced by the hour with no minimum fuss.",
  },
];

export const galleryFilters = ["All", "Bridal", "Engagement", "Festival", "Baby Shower"] as const;
export type GalleryFilter = (typeof galleryFilters)[number];

export type GalleryPhoto = {
  id: number | string;
  category: string;
  label: string;
  /** A real photograph, once one has been uploaded through the dashboard. */
  url?: string;
  /** Seeded placeholder art, for before that. */
  seed?: number;
};

/**
 * Shown until the first photo is uploaded, so a brand-new deployment does not
 * greet visitors with an empty grid.
 */
export const placeholderGallery: GalleryPhoto[] = [
  { id: 1, category: "Bridal", label: "Full bridal hands", seed: 7 },
  { id: 2, category: "Bridal", label: "Arm trail with jaali", seed: 12 },
  { id: 3, category: "Engagement", label: "Ring-finger mandala", seed: 3 },
  { id: 4, category: "Festival", label: "Karwa Chauth mandala", seed: 19 },
  { id: 5, category: "Baby Shower", label: "Blessing motifs", seed: 5 },
  { id: 6, category: "Bridal", label: "Feet, lotus border", seed: 23 },
  { id: 7, category: "Engagement", label: "Minimal wrist band", seed: 9 },
  { id: 8, category: "Festival", label: "Floral jaali panel", seed: 15 },
  { id: 9, category: "Baby Shower", label: "Soft paisley cradle", seed: 11 },
];

export const steps = [
  { n: "01", title: "Message me", body: "Send your date, city and occasion on WhatsApp. I reply the same day." },
  { n: "02", title: "Pick your design", body: "We agree on density, coverage and the motifs that mean something to you." },
  { n: "03", title: "Hold the date", body: "A small advance locks your slot. Bridal dates go first — book early." },
  { n: "04", title: "Wear it well", body: "You get aftercare notes so the stain deepens dark and lasts." },
];
